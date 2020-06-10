const rpcClientClass = require('monero-rpc-client');
var nodeaddr = require('./nodeaddress');
const rpcClient = new rpcClientClass(nodeaddr.NODE_ADDRESS);
const express = require('express');
const app = express();
const port = 1932;
const btoa = require("btoa");
const request = require('request');
const mustacheExpress = require('mustache-express');

/* I have no idea where I got this from */
function fancyTimeFormat(time)
{
var hrs = ~~(time / 3600);
var mins = ~~((time % 3600) / 60);
var secs = ~~time % 60;
var ret = "";
if (hrs > 0) {
ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
}
ret += "" + mins + ":" + (secs < 10 ? "0" : "");
ret += "" + secs;
return ret;
}

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/public');
app.use(express.static('public'));

app.get('/', function(req, res) {
rpcClient.getInfo().then((result_info) => {
    rpcClient.getTransactionPool().then((result_transactions) => {
    var last_block = result_info.result.height - 1;
    var tx_length;

    if(!result_transactions.transactions){
        tx_length = 0;
    }else{
        tx_length = result_transactions.transactions.length;
    }

    request.post({
        headers: {'content-type' : 'application/json'},
        url:     "http://xlanode.com:20189/json_rpc",
        json:    {"jsonrpc":"2.0","id":"0","method":"get_block","params":{"height":	last_block}}
      }, function(error1, response1, body_getblock){
        request.post({
            headers: {'content-type' : 'application/json'},
            url:     "http://xlanode.com:20189/json_rpc",
            json:    {"jsonrpc":"2.0","id":"0","method":"get_block_headers_range","params":{"start_height":last_block - 5,"end_height": last_block - 1}}
          }, function(error2, response2, body_range){

        if(error1){console.log(error1);}
        if(error2){console.log(error1);}
        var str_hash = body_getblock.result.block_header.hash;
        var res_tophash = str_hash.substring(0, 5) + "..." + str_hash.substr(str_hash.length - 5);
        var timeNow = new Date().getTime()/1000;
        var blocksTime = timeNow - body_getblock.result.block_header.timestamp;
        var last_blocks_tx_array = body_getblock.result.tx_hashes;
        var last_blocks_txs_html;
        var prev_blocks_array = (body_range.result.headers).reverse(); //Reversed for correct chronology.
        var prev_blocks_html = "<tbody id='txBody2'>";
        if(prev_blocks_array){
        for(var j = 0; j < prev_blocks_array.length; j++){
            var time_of_prev_block = (timeNow - prev_blocks_array[j].timestamp);
            time_of_prev_block = fancyTimeFormat(time_of_prev_block);
            var prev_block_hash = prev_blocks_array[j].hash;
            var res_prev_hash = prev_block_hash.substring(0, 5) + "..." + prev_block_hash.substr(prev_block_hash.length - 5);
            prev_blocks_html += "<tr><td><a href='/go?data="+prev_block_hash+"'>"
            + res_prev_hash + "</a></td><td>"
            + prev_blocks_array[j].height + "</td>"
            + "<td>" + (prev_blocks_array[j].reward / 100) + "</td><td>"
            + prev_blocks_array[j].difficulty + "</td><td>"
            + time_of_prev_block + "</td>" +"<td class='t-right'>"+prev_blocks_array[j].num_txes+"</td></tr>";
        }
        prev_blocks_html += "</tbody>"
      }
        //More than the cancer I have..I know..LOLZZ
        if(last_blocks_tx_array){
            last_blocks_txs_html = "<thead><tr><th>Transaction hash</th><th>Unlock Block</th><th class='t-right'>Status</th></tr></thead><tbody>";
            var last_blocks_tx_array_length = last_blocks_tx_array.length;
            for (var i = 0; i < last_blocks_tx_array_length; i++) {
                last_blocks_txs_html += "<tr><td>" + last_blocks_tx_array[i] + "</td><td>" + (last_block + 10) + "</td><td class='t-right c-green'><i class='fas fa-check no-margin'></i></td></tr>";
            }
            last_blocks_txs_html += "</tbody>"
        }else{
            last_blocks_txs_html = "<thead><tr><th>No Transactions in the last block!</th></tr></thead>";
        }
                res.render("explorer",{
                    "block_height":result_info.result.height,
                    "difficulty_current":result_info.result.difficulty,
                    "hashrate_current":(((result_info.result.difficulty / 300) / 1000000).toFixed(2)) + " MH/s",
                    "transaction_count":result_info.result.tx_count,
                    "pool_tx_count":tx_length,
                    "tx_pool_data_size": tx_length * 1.73,
                    "incoming_conn_count":result_info.result.incoming_connections_count,
                    "outgoing_conn_count":result_info.result.outgoing_connections_count,
                    "last_hash_top":res_tophash,
                    "last_block_height_top":body_getblock.result.block_header.height,
                    "last_block_reward":(body_getblock.result.block_header.reward / 100),
                    "last_block_difficulty":body_getblock.result.block_header.difficulty,
                    "last_block_when": fancyTimeFormat(blocksTime),
                    "last_block_txs_count":body_getblock.result.block_header.num_txes,
                    "last_tx_hashes":last_blocks_txs_html,
                    "prev_blocks_html":prev_blocks_html
                });
            });
        });
    }).catch((err) => {
        console.log(err)
    });
}).catch((err) => {
console.log(err)
});
});

app.get('/go', function(req, res) {
var got = req.query.data;
var letterNumber = /^[0-9a-zA-Z]+$/;

if(got.length != 64 && !(got.match(letterNumber))){
    res.send("The data you entered was fucked.");
}

request.post({
    headers: {'content-type' : 'application/json'},
    url:     "http://xlanode.com:20189/json_rpc",
    json:    {"jsonrpc":"2.0","id":"0","method":"get_block","params":{"hash": got}}
  }, function(error1, response1, body_getblock){
    if(body_getblock.result == undefined){
        res.redirect("/tx?tx_hash="+got);
    }
    else{
        res.redirect("/block?block_info="+got);
    }
    });
});

app.get('/tx', function(req, res) {
    var got = req.query.tx_hash;
    request.post({
        headers: {'content-type' : 'application/json'},
        url:     "http://xlanode.com:20189/get_transactions",
        json:    {"txs_hashes":[got]}
      }, function(error1, response1, body_txdata){
         if(body_txdata.status.includes("Failed to parse hex representation of transaction hash")){
            res.send("Transaction malformed!");
         }
         else{
         if(body_txdata.missed_tx){
             res.send("Transaction Not Found!");
         }else{
         if(body_txdata.txs[0].in_pool == true){
         rpcClient.getInfo().then((result_info_for_block_stats_page) => {
            var html_for_inpool = "<td class='c-black'>"+got+"</td><td>" + (result_info_for_block_stats_page.result.height + 10) + "</td><td class='t-right'><i class='fas fa-hourglass-half no-margin c-black'></i></td>";

            res.render("go_tx", {
            "html_on_pooltx" : html_for_inpool,
            "stat_block_height":result_info_for_block_stats_page.result.height,
            "stat_block_difficulty":result_info_for_block_stats_page.result.difficulty,
            "stat_block_hashrate":(((result_info_for_block_stats_page.result.difficulty / 300) / 1000000).toFixed(2)) + " MH/s",
            "stat_txcunt":result_info_for_block_stats_page.result.tx_count,
            "stat_tx_pool_size":result_info_for_block_stats_page.result.tx_pool_size,
            "tx_pool_data_size": result_info_for_block_stats_page.result.tx_pool_size * 1.73,
            "stat_incom": result_info_for_block_stats_page.result.incoming_connections_count,
            "stat_outgo": result_info_for_block_stats_page.result.outgoing_connections_count
            });
            }).catch((err) => {
                console.log(err)
            });
         }
         if(body_txdata.txs[0].in_pool == false){
            rpcClient.getInfo().then((result_info_for_block_stats_page) => {
                var html_for_conf = "<td>"+got+"</td><td>" + (result_info_for_block_stats_page.result.height + 10) + "</td><td class='t-right c-green'><i class='fas fa-check no-margin'></i></td>";

                res.render("go_tx", {
                "html_on_pooltx" : html_for_conf,
                "stat_block_height":result_info_for_block_stats_page.result.height,
                "stat_block_difficulty":result_info_for_block_stats_page.result.difficulty,
                "stat_block_hashrate":(((result_info_for_block_stats_page.result.difficulty / 300) / 1000000).toFixed(2)) + " MH/s",
                "stat_txcunt":result_info_for_block_stats_page.result.tx_count,
                "stat_tx_pool_size": result_info_for_block_stats_page.result.tx_pool_size,
                "tx_pool_data_size": result_info_for_block_stats_page.result.tx_pool_size * 1.73,
                "stat_incom": result_info_for_block_stats_page.result.incoming_connections_count,
                "stat_outgo": result_info_for_block_stats_page.result.outgoing_connections_count
                });
                }).catch((err) => {
                    console.log(err)
                });
         }
        }
        }
    });
});

app.get('/block', function(req, res) {
    var got = req.query.block_info;
    if(!isNaN(got)){
        request.post({
            headers: {'content-type' : 'application/json'},
            url:     "http://xlanode.com:20189/json_rpc",
            json:    {"jsonrpc":"2.0","id":"0","method":"get_block","params":{ "height" : got }}
          }, function(error1, response1, body_getblock){
            var txsHTML_inblock;
            txsHTML_inblock = "<tbody>";
            var blocks_tx_array;
            if(body_getblock.result){
                blocks_tx_array = body_getblock.result.tx_hashes;
            }else{
                blocks_tx_array = [];
            }
            if(blocks_tx_array){
                for(var k = 0; k < blocks_tx_array.length; k++){
                txsHTML_inblock += "<tr><td>" + blocks_tx_array[k] + "</td><td>" + (body_getblock.result.block_header.height + 10) + "</td><td class='t-right c-green'><i class='fas fa-check no-margin'></i></td></tr>";
                }
            }else{
                 txsHTML_inblock += "<tr><td>" + "No transactions in this block!" + "</td></tr>";
            }
            txsHTML_inblock += "</tbody>";
            var timeNow = new Date().getTime()/1000;
            var blocksTime = timeNow - body_getblock.result.block_header.timestamp;
            rpcClient.getInfo().then((result_info_for_block_stats_page) => {
                res.render("go_block", {"block_hash" : body_getblock.result.block_header.hash,
                "block_height": body_getblock.result.block_header.height,
                "block_reward": body_getblock.result.block_header.reward / 100,
                "difficulty": body_getblock.result.block_header.difficulty,
                "time_ago": fancyTimeFormat(blocksTime),
                "time_stamp": body_getblock.result.block_header.timestamp,
                "tx_count":body_getblock.result.block_header.num_txes,
                "inblock_txs": txsHTML_inblock,
                "stat_block_height":result_info_for_block_stats_page.result.height,
                "stat_block_difficulty":result_info_for_block_stats_page.result.difficulty,
                "stat_block_hashrate":(((result_info_for_block_stats_page.result.difficulty / 300) / 1000000).toFixed(2)) + " MH/s",
                "stat_txcunt":result_info_for_block_stats_page.result.tx_count,
                "stat_tx_pool_size":result_info_for_block_stats_page.result.tx_pool_size,
                "tx_pool_data_size": result_info_for_block_stats_page.result.tx_pool_size * 1.73,
                "stat_incom": result_info_for_block_stats_page.result.incoming_connections_count,
                "stat_outgo": result_info_for_block_stats_page.result.outgoing_connections_count
                });
                }).catch((err) => {
                    console.log(err)
                });
          });
    }else{
        request.post({
            headers: {'content-type' : 'application/json'},
            url:     "http://xlanode.com:20189/json_rpc",
            json:    {"jsonrpc":"2.0","id":"0","method":"get_block","params":{"hash" : got }}
          }, function(error1, response1, body_getblock){
            var txsHTML_inblock;
            txsHTML_inblock = "<tbody>";
            var blocks_tx_array;
            if(body_getblock.result){
                blocks_tx_array = body_getblock.result.tx_hashes;
            }else{
                blocks_tx_array = [];
            }
            if(blocks_tx_array){
                for(var k = 0; k < blocks_tx_array.length; k++){
                txsHTML_inblock += "<tr><td>" + blocks_tx_array[k] + "</td><td>" + (body_getblock.result.block_header.height + 10) + "</td><td class='t-right c-green'><i class='fas fa-check no-margin'></i></td></tr>";
                }
            }else{
                 txsHTML_inblock += "<tr><td>" + "No transactions in this block!" + "</td></tr>";
            }
            txsHTML_inblock += "</tbody>";
            var timeNow = new Date().getTime()/1000;
            var blocksTime = timeNow - body_getblock.result.block_header.timestamp;
            rpcClient.getInfo().then((result_info_for_block_stats_page) => {
                res.render("go_block", {"block_hash" : body_getblock.result.block_header.hash,
                "block_height": body_getblock.result.block_header.height,
                "block_reward": body_getblock.result.block_header.reward / 100,
                "difficulty": body_getblock.result.block_header.difficulty,
                "time_ago": fancyTimeFormat(blocksTime),
                "time_stamp": body_getblock.result.block_header.timestamp,
                "tx_count":body_getblock.result.block_header.num_txes,
                "inblock_txs": txsHTML_inblock,
                "stat_block_height":result_info_for_block_stats_page.result.height,
                "stat_block_difficulty":result_info_for_block_stats_page.result.difficulty,
                "stat_block_hashrate":(((result_info_for_block_stats_page.result.difficulty / 300) / 1000000).toFixed(2)) + " MH/s",
                "stat_txcunt":result_info_for_block_stats_page.result.tx_count,
                "stat_tx_pool_size":result_info_for_block_stats_page.result.tx_pool_size,
                "tx_pool_data_size": result_info_for_block_stats_page.result.tx_pool_size * 1.73,
                "stat_incom": result_info_for_block_stats_page.result.incoming_connections_count,
                "stat_outgo": result_info_for_block_stats_page.result.outgoing_connections_count
                });
                }).catch((err) => {
                    console.log(err)
                });
          });
    }
});

app.listen(port, () => console.log(`ScalaChain app listening on port ${port}!`));
