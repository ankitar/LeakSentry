
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


console.log('cookies');
chrome.cookies.getAll({}, function(c){
  console.log(c);
});

var taburl;

chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab){
      if(changeInfo.url !== undefined && changeInfo.url !== 'chrome://newtab/'){
        console.log('changeInfo');
        console.log(changeInfo.url);
        taburl = changeInfo.url;
      }
});


chrome.tabs.onActivated.addListener(function(tab){
      taburl = null;
      chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
         function(tabs){
            if(tabs[0].url !== 'chrome://newtab/'){
              // console.log('activated');
              // console.log(tabs[0].url);
              taburl = tabs[0].url;
            }
         }
      );
});


chrome.tabs.onHighlighted.addListener(function(tab){
      taburl = null;
      chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
         function(tabs){
            if(tabs[0].url !== 'chrome://newtab/'){
              // console.log('highlight');
              // console.log(tabs[0].url);
              taburl = tabs[0].url;
            }
         }
      );
});

function getDomain(url){

  var a = document.createElement('a');
  a.href = url;

  return a.hostname;
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(info) {

    // console.log('taburl');
    // console.log(taburl);
    if(taburl !== null && taburl !== undefined){

      var domain = getDomain(taburl);
      /* moved to separate function
      var url = taburl;
      var text = taburl.split('/');
      var new_text = text[2].split('.');
      if(new_text){
        var domain;
        if(new_text.length < 3)
          domain = new_text[0];
        else
          domain = new_text[1];
      }*/

      // console.log('taburl');
      // console.log(taburl);
      // console.log('new text');
      // console.log(new_text);
      // console.log('doamin');
      // console.log(domain);

    }

    var url_thirdparty = info.url;
    if(url_thirdparty.indexOf(domain) != -1){
      //console.log('same domain');
    }
    else{
      //console.log('diff domain');
      //console.log("intercepted: ");
      //console.log(info);
      //console.log(info.url);

      //parse the url using regex
      var regex = /[?]([^&#=]+)=([^&#=]+)/g;
      var found;
      var params = {};
      while(found=regex.exec(url_thirdparty)){
        params[found[1]] = found[2];
      }

      for(var param in params) {
        //add here: go through the user's PII in firebase to check if the query parameters match any of the user provided PII and take required action 
        console.log("Identified leak! The website " + domain + " is leaking your "+ param + " - " + params[param] + " to " + getDomain(url_thirdparty));
      }
    }

    // return {cancel:true};

    // Redirect the lolcal request to a random loldog URL.
    // var i = Math.round(Math.random() * loldogs.length);
    // return {redirectUrl: loldogs[i]};


  },
  // filters
  {
    urls: ["<all_urls>"],
    types: ["main_frame", "sub_frame", "object", "xmlhttprequest","other"] //filtering the type of requests
  },
  // extraInfoSpec
  ["requestHeaders", "blocking"]);
