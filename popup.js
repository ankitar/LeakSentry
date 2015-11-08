function submitDetails(){
    var dataRef = new Firebase('https://leeksentry.firebaseio.com/');
    var firstname = document.getElementById("firstname");
    var lastname = document.getElementById("lastname");
    var year = document.getElementById("year");
    var email = document.getElementById("email");
    var telephone = document.getElementById("telephone");
    dataRef.set({firstname:firstname, lastname:lastname, year:year, email:email, telephone:telephone});
}
window.addEventListener('load', function(evt) {
    var start = 1900;
    var end = new Date().getFullYear();
    var select = document.getElementById("year");
    for(var year = start; year <= end; year++){
      var option = document.createElement('option');
      option.text = option.value = year;
      select.add(option, 0);
    }
});