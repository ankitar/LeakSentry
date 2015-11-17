var google_id = '';
var curr_user = null;
var dataRef = new Firebase('https://leaksentry.firebaseio.com/');

chrome.identity.getProfileUserInfo(function(userInfo){
        google_id = userInfo.email;
});

function submitDetails(){
    event.preventDefault();
    
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