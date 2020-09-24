<?php
    $db = new SQLite3('donations.db');  


    $btc_c = $db->query('SELECT count(txid) FROM btc')->fetchArray()[0];
    while(true){
        $data = json_decode(file_get_contents("https://chain.so/api/v2/address/btc/1XTLY5LqdBXRW6hcHtnuMU7c68mAyW6qm"));
        if($btc_c < $data->data->total_txs){
            for($i=0;$i<($data->data->total_txs-$btc_c);$i++){
                if(isset($data->data->txs[$i]->incoming) && !isset($data->data->txs[$i]->outgoing)){
                    $db->exec('INSERT INTO btc (txid, amount, dTime) VALUES (\''.$data->data->txs[$i]->txid.'\',\''.($data->data->txs[$i]->incoming->value*100000000).'\',\''.time().'\')');
                    print_r($data->data->txs[$i]);
                }
            }

            $btc_c = $data->data->total_txs;
            echo "\n[".date("d.m.Y - H:i:s",time())."] - BTC - Up to date again";
        }else{
            echo ".";
        }
        sleep(30);
    }
?>
