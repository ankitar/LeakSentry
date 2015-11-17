// Global Variables
var google_id = '';
var curr_user_info = null;
var dataRef = new Firebase('https://leaksentry.firebaseio.com/');
var userRef = dataRef.child('Users');

// User Authentication
chrome.identity.getProfileUserInfo(function(userInfo){
        google_id = userInfo.email;
        if(google_id != ''){
            userRef.orderByChild('email').equalTo(google_id).on('value', function(snapshot){
                curr_user_info = snapshot.val();
            });
        }
});

// On submit button click events
function submitDetails(){
    event.preventDefault();
    var firstname = $("#firstname").val();
    var lastname = $("#lastname").val();
    var year = $("#year").val();
    var email = $("#email").val();
    var address = $("#address").val();
    var telephone = $("#telephone").val();
    userRef.push({address:address, email:email, firstname: firstname, lastname:lastname, telephone:telephone, year:year});
}

// On Popup click events
window.addEventListener('load', function(evt) {
    if(!google_id){
        document.getElementById('sign-in').style.display = 'block';
        document.getElementById('user-info-form').style.display = 'none';
        document.getElementById('user-history').style.display = 'none';
    } else if(curr_user_info != null){
        document.getElementById('sign-in').style.display = 'none';
        document.getElementById('user-info-form').style.display = 'block';
        document.getElementById('user-history').style.display = 'none';
        document.getElementById('user-info-form').addEventListener('submit', submitDetails);
    } else{
        document.getElementById('sign-in').style.display = 'none';
        document.getElementById('user-info-form').style.display = 'none';
        document.getElementById('user-history').style.display = 'block';
    }
    
});