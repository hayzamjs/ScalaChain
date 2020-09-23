/* Express and Templating */
const express = require('express')
const app = express()
const port = 1932;
const mustacheExpress = require('mustache-express')
app.engine('html', mustacheExpress())
app.set('view engine', 'html')
app.set('views', __dirname + '/public')
app.use(express.static('public'))

/* Requests */
const bent = require('bent')
const getJSON = bent('json')

/* Configurations */

const config = require("./config")
const explorerAPI = config.EXPLORER_API;
const nodeAddress = config.NODE_ADDRESS;

const GET_EXPLORER_API = bent(explorerAPI, 'GET', 'json', 200);
const POST_NODE_API = bent(nodeAddress, 'POST', 'json', 200);

async function getBlock(heightOrHash){
    if(isNaN(heightOrHash) == true){
        return await POST_NODE_API('/json_rpc', {"jsonrpc":"2.0","id":"0","method":"get_block","params":{"hash":heightOrHash}});
    }else{
        return await POST_NODE_API('/json_rpc', {"jsonrpc":"2.0","id":"0","method":"get_block","params":{"height":heightOrHash}});
    }
}

app.get('/', async (req, res) => {
    /* Network info */
    const networkInfo = await GET_EXPLORER_API('/api/networkinfo');

    /* Transactions */
    const memPool = await GET_EXPLORER_API('/api/mempool');
    const memPoolTxs = memPool.data.txs;
    const memPoolTxCount = memPool.data.txs_no;
    let sizeOfPool = 0;
    const totalCount = networkInfo.data.tx_count;

    if(memPoolTxCount != 0){
            memPoolTxs.forEach(tx => {
                  sizeOfPool += tx.tx_size;
            });
            sizeOfPool = sizeOfPool / 1000; /* To get it in kilobytes */
    }

    /* Last block info */

    const lastHeight = networkInfo.data.height - 1
    const lastBlockInfo = await getBlock(lastHeight)
    console.log(lastBlockInfo)

    res.render("explorer",
                {
                    "block_height": networkInfo.data.height,
                    "difficulty_current":networkInfo.data.difficulty,
                    "hashrate_current":(((networkInfo.data.difficulty) / 120) / 1000000).toFixed(2),
                    "pool_tx_count":memPoolTxCount,
                    "tx_pool_data_size":(sizeOfPool).toFixed(2),
                    "transaction_count":totalCount,
                    "incoming_conn_count":networkInfo.data.incoming_connections_count,
                    "outgoing_conn_count":networkInfo.data.outgoing_connections_count,
                    "last_hash_top":lastBlockInfo.result.block_header.hash,
                    "last_block_height_top":lastBlockInfo.result.block_header.height,
                    "last_block_reward":lastBlockInfo.result.block_header.reward,
                    "last_block_difficulty":lastBlockInfo.result.block_header.difficulty,
                    "last_block_when":lastBlockInfo.result.block_header.timestamp,
                    "last_block_txs_count":lastBlockInfo.result.block_header.num_txes
                });
});

app.get('/go', async (req, res) => {

});

app.get('/tx', function(req, res) {
});

app.get('/block', function(req, res) {
});

app.listen(port, () => console.log(`ScalaChain app listening on port ${port}!`));
