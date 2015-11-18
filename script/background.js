// global variables
var UserRefUrl = 'https://leaksentry.firebaseio.com/users';
var userRef = new Firebase('https://leaksentry.firebaseio.com/users');
var websiteInfoRef = new Firebase('https://leaksentry.firebaseio.com/websiteInfo')
var websiteName = "dummy_website_dot_com";
var user;

// define User object constructor
function User(email, website, firstName, lastName, telephone, year, address, id){
    this.email = email;
    this.website = website;
    this.firstName = firstName;
    this.lastName = lastName;
    this.address = address;
    this.telephone = telephone;
    this.year = year;
    this.id = id;
}

// websiteinfo 
function getWebsiteDetails(websiteName){
  websiteInfoRef.orderByChild(websiteName).once('value', function(snapshot){
    if(snapshot.val() == null){
      alert("new website");
    } else{
      var info = "Actions taken for " + websiteName + "website previously: \n";
      snapshot.forEach(function(data){
        data.forEach(function(part){
          info += part.key() + ": " + part.val();
          info += "\n";

        })
        });
        alert(info);
      }
  });
}


// define current user

chrome.identity.getProfileUserInfo(function(userInfo){
    if(!userInfo.email){
        alert("Please log into your Google Account to use LeakSentry Chrome Extension.");
    }
    else{
        userRef.orderByChild('email').equalTo(userInfo.email).on('value', function(snapshot){
        if(snapshot.val() == null){
          alert("Please enter your PII for LeakSentry to work.");
        } else{
            console.log(snapshot.val());
            snapshot.forEach(function(data) {
                var userData = data.val();
                var website;
                if(userData.hasOwnProperty('website')){
                    website = userData.website;
                }
                user = new User(userData.email, website, userData.firstname, userData.lastname, userData.address, userData.telephone, userData.year, data.key());
                console.log(user);
          });
        }
      });
    }
});

var taburl;

chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab){
      if(changeInfo.url !== undefined && changeInfo.url !== 'chrome://newtab/'){
        taburl = changeInfo.url;
      }
});

chrome.tabs.onActivated.addListener(function(tab){
    taburl = null;
    chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
       function(tabs){
          if(tabs[0].url !== 'chrome://newtab/'){
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

chrome.webRequest.onBeforeSendHeaders.addListener(function(info) {

    if(taburl !== null && taburl !== undefined){
       var domain = getDomain(taburl);
    }

    var url_thirdparty = info.url;
    if(!url_thirdparty.indexOf(domain) != -1){

    console.log("Inspecting third party website " + url_thirdparty + " for possible PPI leak.");

    //parse the URL using regex
    var regex = /[?]([^&#=]+)=([^&#=]+)/g;
    var found;
    var params = {};
    //Check if any query value of the URL matches one of the fields of PII provided by the user
    while(found=regex.exec(url_thirdparty)){
       for(var property in user){
          if (user.hasOwnProperty(property)) {
             if(found[2]==user[property]){ //value being leaked matches PII saved in database
               params[found[1]] = found[2];
             }
          }
       }
    }

    if(Object.keys(params).length>0){

        var domain_thirdparty = getDomain(url_thirdparty);
        var has_visited;

        //For all the PII values which are being leaked
        var leak = "Identified leak! The website " + domain + " is leaking your ";
        for(var param in params) {
          var p = param + " - " + params[param] + "; ";
          leak+=p;
        }
        leak+= " to " ;
        leak+= domain_thirdparty;
        console.log(leak);

        // Check if the user visited the URL in the past
        has_visited = checkIfVisited(domain_thirdparty);
        var prev_action = false;
        if(has_visited!=null){
          prev_action = true;
          console.log("You have visited " + domain_thirdparty + " and " + has_visited + " it.");
        }
        
        //Crowdsourcing
        var majority = "x% of users have y-ed.";
        console.log(majority);

        var message = leak + "\n" + "Alexa Rank: " + 9999 + "\n" + "WOT: " +   "Low Trustworthiness" + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";
        var action = prompt(message + "Enter 1 to allow, 2 to block and 3 to scrub", "3");
        updateUserWebsiteInfo(domain_thirdparty, action);
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
    urlModified = convertToInternalUrl(url);
    //If user is undefined return null - not possible though but shit can happen
    if(typeof user == "undefined"){
        return null;
    }
    var website = user.website;
    if(typeof website == "undefined"){
        return null;
    }
    if(website.hasOwnProperty(urlModified)){
        return website[urlModified];
    }
}

// update action taken by the user for the website.
function updateUserWebsiteInfo(url, action){
    console.log()
    if(typeof user.website == "undefined") {
        currentUserRefUrl = UserRefUrl + '/' + user.id;
        var websiteJson = new Object();
        websiteJson[convertToInternalUrl(url)] = action;
        var json = new Object();
        json['website'] = websiteJson;
        currentUserRefUrl.update(JSON.stringify(json));
        console.log("update successful");
    } else {
        
    }
    
}

// convert URL to internal storage format
function convertToInternalUrl(url){
    var re = /[\.]{1}/g;
    return url.replace(re, '_dot_');
}