const rpcClientClass = require('monero-rpc-client');
const NODE_ADDRESS = 'http://127.0.0.1:20189';
const rpcClient = new rpcClientClass(NODE_ADDRESS);
const express = require('express');
const app = express();
const port = 6969;
const btoa = require("btoa");
var request = require('request');

app.use(express.static('public'))

app.get('/getinfo', function(req, res) {
    rpcClient.getInfo().then((result) => {
        res.send(result);
    }).catch((err) => {});
})

app.get('/gettxs', function(req, res) {
    rpcClient.getTransactionPool().then((result) => {
        if (result.status == "OK" && result.transactions.length > 0) {
            var txs = [];
            for (let i = 0; i <= result.transactions.length - 1; i++) {
                let fee = result.transactions[i].fee.toString();
                let id_hash = result.transactions[i].id_hash;
                let oneTx = fee + "||" + id_hash;
                let oneTxb64 = btoa(oneTx);
                txs.push(oneTxb64);
            }
            res.send(JSON.stringify(Object.assign({}, txs)));
        } else {
            res.send("OK");
        }
    }).catch((err) => {});
});

//Get by range wasn't implemented hence the direct call!
app.get('/getBlocks', function(req, res) {
    rpcClient.getBlockCount().then((result) => {
        var countEnd = result.result.count - 1;
        var countStart = result.result.count - 11;
        var headers = {
            'Content-Type': 'application/json'
        };
        var dataString = '{"jsonrpc":"2.0","id":"0","method":"get_block_headers_range","params":{"start_height":' + countStart + ',"end_height":' + countEnd + '}}';
        var options = {
            url: 'http://scalanode.com:20189/json_rpc',
            method: 'POST',
            headers: headers,
            body: dataString
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                res.send(body);
            }
        }
        request(options, callback);

    }).catch((err) => {});
});

app.listen(port, () => console.log(`ScalaChain app listening on port ${port}!`))
