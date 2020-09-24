<?php
    ini_set('display_errors', 1);
    header('Content-Type: application/json');
    $data = json_decode(file_get_contents("php://input"));
    
    $handle = fopen("log.txt", "a+");
    $log = "Open Database...";
    fwrite($handle, $log . "\n");
    fclose($handle);
    
    $db = new SQLite3('donations.db');
    $handle = fopen("log.txt", "a+");
    $log = "Prepare Query";
    fwrite($handle, $log . "\n");
    fclose($handle);
    if($data->complete){
        $result = $db->query('INSERT INTO xtl (txid, amount, dTime) VALUES (\''.$data->txid.'\',\''.$data->amount.'\',\''.time().'\')');
        if(!$result)
        {
            $handle = fopen("log.txt", "a+");
            $log = json_encode(array("data" => $data , "Error"=>$db->lastErrorMsg()));
            fwrite($handle, $log . "\n\n");
            fclose($handle);
        }else{
            $handle = fopen("log.txt", "a+");
            $log = json_encode(array("data" => $data , "Error"=>"false"));
            fwrite($handle, $log . "\n\n");
            fclose($handle);
        }
    }else{
        $handle = fopen("log.txt", "a+");
        $log = "Not Complete";
        fwrite($handle, $log . "\n");
        fclose($handle);
    }
?>
