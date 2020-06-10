function goSearch(){
    var variable = document.getElementById("chain_data").value;
    var alphanumeric_variable = variable.replace(/[^a-z0-9]/gi,'');
    if(!isNaN(alphanumeric_variable)){ // is a number so can only be a block if being anything.
      location.href = "/block?block_info=" + alphanumeric_variable;
    }else{
      location.href = "/go?data=" + alphanumeric_variable;
    }
}

$(function(){
    $("#chain_data").on('keypress',function(e) {
        if(e.which == 13) {
            goSearch();
        }
    });
});