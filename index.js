const rpcClientClass = require('monero-rpc-client');
const NODE_ADDRESS = 'http://127.0.0.1:20189';
const rpcClient = new rpcClientClass(NODE_ADDRESS);
const express = require('express');
const app = express();
const port = 6969;
const btoa = require("btoa");
const request = require('request');

const mustacheExpress = require('mustache-express');

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/mustache_templates');
app.use(express.static('public'))


app.get('/getinfo', function(req, res) {
    rpcClient.getInfo().then((result) => {
        res.send(result);
    }).catch((err) => {});
})

app.get('/check/:hash', function(req, res) {
    var pp = req.params.hash;
    var letterNumber = /^[0-9a-zA-Z]+$/;

    if(pp.length != 64 && !(pp.match(letterNumber))){
        res.redirect("/error.html");
    }

    else{
    var headers = {
        'Content-Type': 'application/json'
    };
    
    var dataString = '{"jsonrpc":"2.0","id":"0","method":"get_block","params":{"hash":"' + pp +'"}}';
    
    var options = {
        url: 'http://127.0.0.1:20189/json_rpc',
        method: 'POST',
        headers: headers,
        body: dataString
    };
    
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bodyParsed = JSON.parse(body);
            if(bodyParsed.result == undefined){
            res.redirect("/tx/"+pp);
            }
            else{
                res.redirect("/block/"+pp);
            }
        }
    }
    
    request(options, callback);
}
})

// Get by a single block call was a complete cluster fuck hence the custom call.
app.get('/block/:hash', function(req, res) {
var dataString;
var headers = {
        'Content-Type': 'application/json'
};
    //not a number
    if(isNaN(req.params.hash)){
    dataString = '{"jsonrpc":"2.0","id":"0","method":"get_block","params":{"hash":"'+req.params.hash+'"}}';
    }
    else{
    dataString = '{"jsonrpc":"2.0","id":"0","method":"get_block","params":{"height":"'+req.params.hash+'"}}';
    }
var options = {
        url: 'http://127.0.0.1:20189/json_rpc',
        method: 'POST',
        headers: headers,
        body: dataString
};
    
function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bodyParsed = JSON.parse(body);
            if(bodyParsed.result == undefined){
                res.send("INVALID!");
            }
            else{
                var txx = [];
                var block_hash = bodyParsed.result.block_header.hash; // Hash of the block
                var difficulty =  bodyParsed.result.block_header.difficulty; // difficulty of the block
                var cumulative_difficulty =  bodyParsed.result.block_header.cumulative_difficulty; //Cumulative difficulty upto the block.
                var height = bodyParsed.result.block_header.height; //height of the block
                var major_version = bodyParsed.result.block_header.major_version; //minor version of the block
                var minor_version = bodyParsed.result.block_header.minor_version; //major version of the block
                var nonce = bodyParsed.result.block_header.nonce; //nonce of the block
                var reward = bodyParsed.result.block_header.reward; //total reward of this block
                var timestamp = bodyParsed.result.block_header.timestamp; //timestamp of when the block was found
                if(bodyParsed.result.tx_hashes){
                for(var i = 0; i<= bodyParsed.result.tx_hashes.length - 1; i++){
                   txx.push(bodyParsed.result.tx_hashes[i]);
                }
                //console.log(JSON.stringify(txx));
                res.render('block', {"block_number": height,"block_hash":block_hash,"cumulative_diff":cumulative_difficulty,"diff":difficulty,
                "reward":reward,"version":major_version+"."+minor_version,"nonce":nonce,"timestamp":timestamp,
                "tx_hashes":txx});
                }
                else{
                res.render('block', {"block_number": height,"block_hash":block_hash,"cumulative_diff":cumulative_difficulty,"diff":difficulty,
                "reward":reward,"version":major_version+"."+minor_version,"nonce":nonce,"timestamp":timestamp,
                "tx_hashes":"Empty"});
                }
            }
        }
}
    
request(options, callback);
})

app.get('/tx/:hash', function(req, res) {
    var headers = {
        'Content-Type': 'application/json'
    };
    
    var dataString = '{"txs_hashes":["'+req.params.hash+'"]}';
    
    var options = {
        url: 'http://127.0.0.1:20189/get_transactions',
        method: 'POST',
        headers: headers,
        body: dataString
    };
    
    function callback(error, response, body) {
        if (!error && response.statusCode == 200) {
            var bodyParsed = JSON.parse(body);
            if(bodyParsed.txs != undefined){
            var tx_hash = bodyParsed.txs[0].tx_hash;
            var confirmStatus;
            if(bodyParsed.txs[0].in_pool == false){
              confirmStatus = "Confirmed";
            var block_height = bodyParsed.txs[0].block_height;
            var block_timestamp = bodyParsed.txs[0].block_timestamp;
            res.render('tx', {"tx_hash": tx_hash, "confirm_status":confirmStatus, "block_height":block_height,"block_timestamp":block_timestamp});
 
            }
            else{
              confirmStatus = "Not confirmed";

              res.render('tx', {"tx_hash": tx_hash, "confirm_status":confirmStatus, "block_height":"Unconfirmed","block_timestamp":"Unconfirmed"});

            }           
            }
        }
    }
    request(options, callback);
});

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
            url: 'http://127.0.0.1:20189/json_rpc',
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
