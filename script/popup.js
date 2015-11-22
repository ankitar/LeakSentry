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
                    if(curr_user_info){
                        show_history();
                    }
                    show_form();
                });
            }
            else
                show_form();         
    });


});

// Form details
function show_form(){
    if(!google_id){
        document.getElementById('sign-in').style.display = 'block';
    } else if(!curr_user_info){
        document.getElementById('sign-in').style.display = 'none';
        document.getElementById('user-info-form').style.display = 'block';
        document.getElementById('user-info-form').addEventListener('submit', submitDetails);
    } else{
        document.getElementById('user-info-form').style.display = 'none';
        document.getElementById('user-history').style.display = 'block';
    }

}


// User History

function show_history(){
    var message = "<h3>User information:</h3>";
    userRef.orderByChild('email').equalTo(google_id).on('value', function(snapshot){
        if(snapshot.val() != null){
            snapshot.forEach(function(data){
                var userData = data.val();
                message += "<b>First Name:</b> " + userData.firstname + "<br>";
                message += "<b>Last Name:</b> " + userData.lastname + "<br>";
                message += "<b>Email:</b> " + userData.email + "<br>";
                message += "<b>Year of Birth:</b> " + userData.year + "<br>";
                message += "<b>Telephone Number:</b> " + userData.telephone + "<br>";
                message += "<b>Address:</b> " + userData.address + "<br>";
            });
        }
        document.getElementById('user-history').innerHTML = message;

    });
}
