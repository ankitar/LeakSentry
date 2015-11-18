// Global Variables
var google_id;
var curr_user_info;
var userRef = new Firebase('https://leaksentry.firebaseio.com/users');



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
$(document).ready(function(){

    chrome.identity.getProfileUserInfo(function(userInfo){
            google_id = userInfo.email;
            if(google_id != ''){
                userRef.orderByChild('email').equalTo(google_id).on('value', function(snapshot){
                    curr_user_info = snapshot.val();
                    show_form();
                });
            }
            else
                show_form();         
    });


});

// Form details
function show_form(){
    console.log(curr_user_info);
    console.log(google_id);

    if(!google_id){
        document.getElementById('sign-in').style.display = 'block';
<<<<<<< HEAD
        document.getElementById('user-info-form').style.display = 'none';
        document.getElementById('user-history').style.display = 'none';
    } else if(curr_user_info == null){
        document.getElementById('sign-in').style.display = 'none';
=======
        
    } else if(!curr_user_info){
>>>>>>> a70d2583cff9e07a3beebcb12e9788bc78162b01
        document.getElementById('user-info-form').style.display = 'block';
        document.getElementById('user-info-form').addEventListener('submit', submitDetails);
    } else{
        document.getElementById('user-history').style.display = 'block';
    }

}
