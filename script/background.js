chrome.identity.getProfileUserInfo(function(userInfo){
    if(!userInfo.email){
        alert("Please log into your Google Account to use LeakSentry Chrome Extension.");
    }
    else{
      var fireBaseRef = new Firebase('https://leaksentry.firebaseio.com/Users');
      fireBaseRef.orderByChild('email').equalTo(userInfo.email).on('value', function(snapshot){
        if(snapshot.val() == null){
          alert("Please enter your PII for LeakSentry to work.");
        } else{
          var info = "";
          snapshot.forEach(function(data) {
            data.forEach(function(part){
              info += part.val();
              info += "\n";
            })
          });
          alert(info);
        }
      });
    }
}); 

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(info) {
    console.log("intercepted: ");
    console.log(info);
    // Redirect the lolcal request to a random loldog URL.
    // var i = Math.round(Math.random() * loldogs.length);
    // return {redirectUrl: loldogs[i]};
  },
  // filters
  {urls: ["<all_urls>"]},
  // extraInfoSpec
  ["requestHeaders", "blocking"]);
