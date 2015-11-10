function submitDetails(){
    event.preventDefault();

    console.log('submit');

    var dataRef = new Firebase('https://leaksentry.firebaseio.com/');
    var firstname = $("#firstname").val();
    var lastname = $("#lastname").val();
    var year = $("#year").val();
    var email = $("#email").val();
    var address = $("#address").val();
    var telephone = $("#telephone").val();

    dataRef.push({address:address, email:email, firstname: firstname, lastname:lastname, telephone:telephone, year:year});
    alert("hi");
}

window.addEventListener('load', function(evt) {
    // console.log('1');
    // var start = 1900;
    // var end = new Date().getFullYear();
    // var select = document.getElementById("year");
    // for(var year = start; year <= end; year++){
    //   var option = document.createElement('option');
    //   option.text = option.value = year;
    //   select.add(option, 0);
    // }
    document.getElementById('user-info-form').addEventListener('submit', submitDetails);
});
