chrome.identity.getProfileUserInfo(function(userInfo){
    if(!userInfo.email){
        alert("Please log into your Google Account to use LeakSentry Chrome Extension.");
    }
});