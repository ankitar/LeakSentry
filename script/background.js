chrome.identity.getProfileUserInfo(function(userInfo){
    if(!userInfo.email){
        alert("Please log into your Google Account to use LeakSentry Chrome Extension.");
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
