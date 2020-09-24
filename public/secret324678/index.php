<?php
echo "Import";
    $db = new SQLite3('secret324678/donations.db');
    
    $results = $db->query('SELECT * FROM xtl');
    echo "<pre>";
    echo "Is durch";
    while ($row = $results->fetchArray()) {
       print_r($row);
    }
?>
