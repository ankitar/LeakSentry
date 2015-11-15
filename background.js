chrome.webRequest.onBeforeRequest.addListener(
  function(info) {
    console.log("intercepted: ");
    console.log(info);
    // Redirect the lolcal request to a random loldog URL.
    // var i = Math.round(Math.random() * loldogs.length);
    // return {redirectUrl: loldogs[i]};
  },
  // filters
  {urls: ["*://www.facebook.com/*"]},
  // extraInfoSpec
  ["blocking"]);
