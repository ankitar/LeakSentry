var google_id = '';

chrome.identity.getProfileUserInfo(function(userInfo){
        google_id = userInfo.email;
});

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
}

window.addEventListener('load', function(evt) {
    if(!google_id){
        document.getElementById('sign-in').style.display = 'block';
        document.getElementById('user-info-form').style.display = 'none';
        document.getElementById('user-history').style.display = 'none';
    } else{
        document.getElementById('sign-in').style.display = 'none';
        document.getElementById('user-info-form').style.display = 'block';
        document.getElementById('user-history').style.display = 'none';
        document.getElementById('user-info-form').addEventListener('submit', submitDetails);
    }
    
});