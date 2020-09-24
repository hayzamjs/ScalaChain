<?php
    echo "Import";
    ini_set('display_errors', 1);
    $db = new SQLite3('donations.db');
    
    $db->exec("INSERT INTO xtl (txid, amount, dTime) VALUES ('testlol', '123', '435246')");
?>
