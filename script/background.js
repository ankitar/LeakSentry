    // define User object constructor
    function User(email, website){
        this.email = email;
        this.website = website;
    }

    // define current user
    var user;

    var fireBaseRef = new Firebase('https://leaksentry.firebaseio.com/users');

    chrome.identity.getProfileUserInfo(function(userInfo){
        if(!userInfo.email){
            alert("Please log into your Google Account to use LeakSentry Chrome Extension.");
        }
        else{
            fireBaseRef.orderByChild('email').equalTo(userInfo.email).on('value', function(snapshot){
            if(snapshot.val() == null){
              alert("Please enter your PII for LeakSentry to work.");
            } else{
                console.log(snapshot.val());
                snapshot.forEach(function(data) {
                    var userData = data.val();
                    var email = userData.email;
                    var website;
                    if(userData.hasOwnProperty('website')){
                        website = userData.website;
                    }
                    user = new User(email, website);
                    //console.log(user);
              });
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

        if(taburl !== null && taburl !== undefined){
          var domain = getDomain(taburl);
        }

        var url_thirdparty = info.url;
        if(!url_thirdparty.indexOf(domain) != -1){

          console.log("Inspecting third party website " + url_thirdparty + " for possible PPI leak.");

          //parse the url using regex
          var regex = /[?]([^&#=]+)=([^&#=]+)/g;
          var found;
          var params = {};
          checkIfVisited(getDomain(url_thirdparty));
          while(found=regex.exec(url_thirdparty)){
            params[found[1]] = found[2];
            // Check if user visited the URL before
            // Get the response distribution for
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

      // This function checks if URL was visited before by the user, if it was visited then returns action take otherwise returns
    function checkIfVisited(url){

        var re = /[\.]{1}/g;
        urlModified = url.replace(re, '_dot_');

        // if user is undefined return null - not possible though but shit can happen
        if(typeof user == "undefined")
            return null;

        if(typeof user.website == "undefined"){
            return null;
        }

        var website = user.website;
        if(website.hasOwnProperty(urlModified))
            console.log('website found' + url + " " + website[urlModified]);
    }
