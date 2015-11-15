function submitDetails(){
    event.preventDefault();

    console.log('submit');

    var dataRef = new Firebase('https://leaksentry.firebaseio.com/');
    var firstname = $("#firstname").val().toLowerCase();
    var lastname = $("#lastname").val().toLowerCase();
    var year = $("#year").val().toLowerCase();
    var email = $("#email").val().toLowerCase();
    var address = $("#address").val().toLowerCase();
    var telephone = $("#telephone").val();

    dataRef.push({address:address, email:email, firstname: firstname, lastname:lastname, telephone:telephone, year:year});
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

chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    console.log("intercepted: " + info.url);
    // Redirect the lolcal request to a random loldog URL.
    // var i = Math.round(Math.random() * loldogs.length);
    // return {redirectUrl: loldogs[i]};
  },
  // filters
  {
    {urls: ["<all_urls>"]},
  },
  // extraInfoSpec
  ["blocking"]);

