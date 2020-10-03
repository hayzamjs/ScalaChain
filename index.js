/* Express and Templating */
const express = require('express')
const app = express()
const port = 1932
const path = require('path')
const bodyParser = require('body-parser')
const mustacheExpress = require('mustache-express')
const timeAgo = require("timeago.js");

var locale = function(number, index, totalSec) {
  return [
    ['just now', 'just now'],
    ['%s secs ago', '%s secs ago'],
    ['1 min ago', '1 min ago'],
    ['%s mins ago', '%s mins ago'],
    ['1 hour ago', '1 hour ago'],
    ['%s hours ago', '%s hours ago'],
    ['1 day ago', '1 day ago'],
    ['%s days ago', '%s days ago'],
    ['1 week ago', '1 week ago'],
    ['%s weeks ago', '%s weeks ago'],
    ['1 month ago', '1 month ago'],
    ['%s months ago', '%s months ago'],
    ['1 year ago', '1 year ago'],
    ['%s years ago', '%s years ago']
  ][index];
};

timeAgo.register('pt_BR', locale);

app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.engine('html', mustacheExpress())
app.set('view engine', 'html')
app.set('views', path.join(__dirname, '/public'))
app.use(express.static('public'))

/* Requests */
const bent = require('bent')

/* Configurations */

const config = require('./config')
const explorerAPI = config.EXPLORER_API
const nodeAddress = config.NODE_ADDRESS

const GET_EXPLORER_API = bent(explorerAPI, 'GET', 'json', 200)
const POST_NODE_API = bent(nodeAddress, 'POST', 'json', 200)

async function getBlock (heightOrHash) {
  if (isNaN(heightOrHash) === true) {
    return await POST_NODE_API('/json_rpc', { jsonrpc: '2.0', id: '0', method: 'get_block', params: { hash: heightOrHash } })
  } else {
    return await POST_NODE_API('/json_rpc', { jsonrpc: '2.0', id: '0', method: 'get_block', params: { height: heightOrHash } })
  }
}

async function getBlockRange (startHeight, endHeight) {
  return await POST_NODE_API('/json_rpc', { jsonrpc: '2.0', id: '0', method: 'get_block_headers_range', params: { start_height: startHeight, end_height: endHeight } })
}

async function getNetworkInfo () {
  return await GET_EXPLORER_API('/api/networkinfo')
}

async function getTransaction (txHash) {
  return await GET_EXPLORER_API(`/api/transaction/${txHash}`)
}

function countdown(s) {
  const d = Math.floor(s / (3600 * 24));
  s  -= d * 3600 * 24;
  const h = Math.floor(s / 3600);
  s  -= h * 3600;
  const m = Math.floor(s / 60);
  s  -= m * 60;
  const tmp = [];
  (d) && tmp.push(d + 'd');
  (d || h) && tmp.push(h + 'h');
  (d || h || m) && tmp.push(m + 'm');
  tmp.push(s + 's');
  return tmp.join(' ');
}

async function proveTransacion (txHash, address, key, method) {
  const proof = await GET_EXPLORER_API(`/api/outputs?txhash=${txHash}&address=${address}&viewkey=${key}&txprove=${method}`)
  if (proof.status !== 'error') {
    if (proof.data.tx_prove === true) {
      return true
    }
    return false
  }
  return false
}

async function isBlock (data) {
  const getBlock = await POST_NODE_API('/json_rpc', { jsonrpc: '2.0', id: '0', method: 'get_block', params: { hash: data } })
  if (getBlock.error) {
    return false
  } else {
    return true
  }
}

async function getMempoolSize () {
  const memPool = await GET_EXPLORER_API('/api/mempool')
  const memPoolTxs = memPool.data.txs
  const memPoolTxCount = memPool.data.txs_no
  let sizeOfPool = 0

  if (memPoolTxCount !== 0) {
    memPoolTxs.forEach(tx => {
      sizeOfPool += tx.tx_size
    })
    return (sizeOfPool / 1000) /* To get it in kilobytes */
  } else {
    return 0
  }
}

app.get('/prove', async (req, res) => {
  res.render('prove')
})

app.post('/prove', async (req, res) => {
  const proof = await proveTransacion(req.body.tx_hash, req.body.address, req.body.key, req.body.method)
  if (proof === true) {
    res.send(true)
  } else {
    res.send(false)
  }
})

app.get('/', async (req, res) => {
  const timeNow = new Date().getTime() / 1000;
  /* Network info */
  const networkInfo = await getNetworkInfo()

  /* Transactions */
  const sizeOfPool = await getMempoolSize()

  /* Last block info */
  const lastHeight = networkInfo.data.height - 1
  const lastBlockInfo = await getBlock(lastHeight)
  const lastBlockTxHashes = lastBlockInfo.result.tx_hashes
  const transactionsCount = lastBlockInfo.result.block_header.num_txes

  /* Transactions inside the last block */
  let transactionsHTML = ''

  if (transactionsCount > 0) {
    transactionsHTML = `<thead>
        <tr>
            <th>Transaction hash</th>
            <th>Unlock Block</th>
            <th class='t-right'>Status</th>
        </tr>
        </thead>
        <tbody>`
    lastBlockTxHashes.forEach(txHash => {
      transactionsHTML += `<tr>
                                     <td>${txHash}</td>
                                     <td>${lastHeight + 10}</td>
                                     <td class='t-right c-green'>
                                        <i class='fas fa-check no-margin'></i>
                                    </td>
                                  </tr>`
    })
    transactionsHTML += '</tbody>'
  } else {
    transactionsHTML = '<thead><tr><th>No Transactions in the last block</th></tr></thead>'
  }

  /* Previous 10 blocks */

  const tenBlocks = await getBlockRange((lastHeight - 11), (lastHeight - 1))
  const tenBlocksHeaders = (tenBlocks.result.headers).reverse()
  let tenBlocksHTML = '<tbody id=\'txBody2\'>'
  tenBlocksHeaders.forEach(header => {
    const headerLink = `/block?block_info=${header.hash}`
    tenBlocksHTML += `<tr><td><a href="${headerLink}">${header.hash.substring(0, 5)}...${header.hash.substring(header.hash.length - 5)}</a></td><td>${header.height}</td><td>${(((header.reward) / 100) * (75/100)).toFixed(2)}</td><td>${(((header.reward) / 100) * (25/100)).toFixed(2)}</td>
        <td>${(header.difficulty)}</td><td>${timeAgo.format(header.timestamp * 1000, 'pt_BR')}</td><td class='t-right'>${(header.num_txes)}</td></tr>`
  })
  tenBlocksHTML += '</tbody>'

  res.render('explorer',
    {
      block_height: networkInfo.data.height,
      difficulty_current: networkInfo.data.difficulty,
      hashrate_current: (((networkInfo.data.difficulty) / 120) / 1000000).toFixed(2),
      pool_tx_count: networkInfo.data.tx_pool_size,
      tx_pool_data_size: (sizeOfPool).toFixed(2),
      transaction_count: networkInfo.data.tx_count,
      incoming_conn_count: networkInfo.data.incoming_connections_count,
      outgoing_conn_count: networkInfo.data.outgoing_connections_count,
      last_hash_top: lastBlockInfo.result.block_header.hash,
      last_block_height_top: lastBlockInfo.result.block_header.height,
      last_block_reward: ((((lastBlockInfo.result.block_header.reward) / 100)) * (75/100)).toFixed(2),
      last_block_reward_ldpow: (((lastBlockInfo.result.block_header.reward) / 100) * (25/100)).toFixed(2),
      last_block_difficulty: lastBlockInfo.result.block_header.difficulty,
      last_block_when: timeAgo.format(lastBlockInfo.result.block_header.timestamp * 1000, 'pt_BR'),
      last_block_txs_count: transactionsCount,
      prev_blocks_html: tenBlocksHTML,
      last_blocks_transactions: transactionsHTML
    })
})

app.get('/tx', async (req, res) => {
  const networkInfo = await getNetworkInfo()
  const txInfo = await getTransaction(req.query.tx_info)
  const confirmed = ((txInfo.data.current_height - txInfo.data.block_height) > 10)
  let txStatus = ''
  let paymentId = ''
  const sizeOfPool = await getMempoolSize()

  if (confirmed) {
    txStatus += '<i class=\'fa fa-check no-margin\'></i>'
  } else {
    txStatus += '<i class=\'fa fa-clock no-margin\'></i>'
  }

  if (txInfo.data.payment_id !== '' || txInfo.data.payment_id8 !== '') {
    paymentId += '<i class="fa fa-times" aria-hidden="true"></i>'
  } else {
    if (txInfo.data.payment_id !== '') {
      paymentId += txInfo.data.payment_id
    } else {
      paymentId += txInfo.data.payment_id8
    }
  }

  let keyImagesInputHTML = ''
  let keyImagesOutputHTML = '';

  (txInfo.data.inputs).forEach(input => {
    keyImagesInputHTML += `<tr><td>?</td><td>${input.key_image}</td></tr>`
  });

  (txInfo.data.outputs).forEach(output => {
    keyImagesOutputHTML += `<tr><td>?</td><td>${output.public_key}</td></tr>`
  })

  res.render('go_tx',
    {
      tx_hash: txInfo.data.tx_hash,
      mixins: txInfo.data.mixin,
      tx_status: txStatus,
      tx_extra: txInfo.data.extra,
      payment_id: paymentId,
      rct_type: txInfo.data.rct_type,
      timestamp: txInfo.data.timestamp,
      timestamp_utc: txInfo.data.timestamp_utc,
      tx_fee: `${(txInfo.data.tx_fee / 100)} XLA`,
      tx_size: `${(txInfo.data.tx_size / 1000).toFixed(2)} kb`,
      tx_version: txInfo.data.tx_version,
      key_image_inputs: keyImagesInputHTML,
      key_image_outputs: keyImagesOutputHTML,
      stat_block_height: networkInfo.data.height,
      stat_block_difficulty: networkInfo.data.difficulty,
      stat_block_hashrate: (((networkInfo.data.difficulty) / 120) / 1000000).toFixed(2),
      stat_txcount: networkInfo.data.tx_count,
      stat_tx_pool_size: networkInfo.data.tx_pool_size,
      tx_pool_data_size: sizeOfPool,
      stat_incom: networkInfo.data.incoming_connections_count,
      stat_outgo: networkInfo.data.outgoing_connections_count
    })
})

app.get('/search', async (req, res) => {
  const vin = await isBlock(req.query.data)
  if (vin === true) {
    res.redirect(`/block?block_info=${req.query.data}`)
  } else {
    res.redirect(`/tx?tx_info=${req.query.data}`)
  }
})

app.get('/block', async (req, res) => {
  const timeNow = (new Date().getTime()/1000);
  const gotBlockInfo = req.query.block_info
  const blockInfo = await getBlock(gotBlockInfo)
  const lastBlockTxHashes = blockInfo.result.tx_hashes
  const transactionsCount = blockInfo.result.block_header.num_txes
  const networkInfo = await getNetworkInfo()
  const sizeOfPool = await getMempoolSize()

  let blockTxsHTML = ''
  if (transactionsCount > 0) {
    blockTxsHTML += `<thead>
        <tr>
            <th>Transaction hash</th>
            <th>Unlock Block</th>
            <th class='t-right'>Status</th>
        </tr>
        </thead>
        <tbody>`

    lastBlockTxHashes.forEach(txHash => {
      blockTxsHTML += `<tr>
                                     <td>${txHash}</td>
                                     <td>${blockInfo.result.block_header.height + 10}</td>
                                     <td><td class='t-right c-green'>
                                        <i class='fas fa-check no-margin'></i>
                                    </td>
                                  </tr>`
    })

    blockTxsHTML += '</tbody>'
  } else {
    blockTxsHTML = '<thead><tr><th>No Transactions in this block</th></tr></thead>'
  }

  res.render('go_block',
    {
      block_hash: blockInfo.result.block_header.hash,
      block_height: blockInfo.result.block_header.height,
      block_reward: ((blockInfo.result.block_header.reward) / 100),
      difficulty: blockInfo.result.block_header.difficulty,
      time_ago: timeAgo.format(blockInfo.result.block_header.timestamp * 1000, 'pt_BR'),
      time_stamp: blockInfo.result.block_header.timestamp,
      tx_count: transactionsCount,
      inblock_txs: blockTxsHTML,
      stat_block_height: networkInfo.data.height,
      stat_block_difficulty: networkInfo.data.difficulty,
      stat_block_hashrate: (((networkInfo.data.difficulty) / 120) / 1000000).toFixed(2),
      stat_txcount: networkInfo.data.tx_count,
      stat_tx_pool_size: networkInfo.data.tx_pool_size,
      tx_pool_data_size: sizeOfPool,
      stat_incom: networkInfo.data.incoming_connections_count,
      stat_outgo: networkInfo.data.outgoing_connections_count
    })
})

app.listen(port, () => console.log(`ScalaChain app listening on port ${port}!`))
