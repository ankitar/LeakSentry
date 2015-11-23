// global variables
var UserRefUrl = 'https://leaksentry.firebaseio.com/users';
var userRef = new Firebase('https://leaksentry.firebaseio.com/users');
var websiteInfoRef = new Firebase('https://leaksentry.firebaseio.com/websiteInfo');
var user;
var highestFreqAction;
var frequencyOfAction = -1;
var browsing_data;
var global_snapshot;
var global_user_snapshot;
var user_loggedin;
var user_email;
var taburl;
var prev_request;

//get website snapshot
websiteInfoRef.on('value', function(snapshot){
  global_snapshot = snapshot;
});

//get user snapshot
userRef.once('value', function(snapshot){
  snapshot.forEach(function(childsnapshot){
    if(user_email != undefined && user_email === childsnapshot.child('email').val()){
      user_loggedin = true;
    }
  });
  global_user_snapshot = snapshot;
});


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


// check browsing history
chrome.history.search({text: ''}, function(data){
  console.log('history');
  browsing_data = data;
});


// define current user
chrome.identity.onSignInChanged.addListener(function (account, signedIn) {
  user_loggedin = signedIn;
});


chrome.identity.getProfileUserInfo(function(userInfo){
    if(!userInfo.email){
        alert("Please log into your Google Account to use LeakSentry Chrome Extension. This email ID will be associated with your LeakSentry account.");
        user_loggedin = false;
    }
    else{
        user_email = userInfo.email;
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
          });
        }
      });
    }
});


chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab){
      if(changeInfo.url !== undefined && changeInfo.url !== 'chrome://newtab/'){
        taburl = changeInfo.url;
      }
});


chrome.tabs.onActivated.addListener(function(tab){
    taburl = null;
    chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
       function(tabs){
          if(tabs != undefined && tabs.length > 0 && tabs[0].url !== 'chrome://newtab/'){
             taburl = tabs[0].url;
          }
       }
    );
});


chrome.tabs.onHighlighted.addListener(function(tab){
    taburl = null;
    chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
      function(tabs){
        if(tabs != undefined && tabs.length > 0 && tabs[0].url !== 'chrome://newtab/'){
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


function getMaliciousWebsiteStats(websiteName){
  var snapshot = global_snapshot.child(websiteName);
  frequencyOfAction = -1;
  var total = 0;
  if(snapshot.val() != null){
    snapshot.forEach(function(data){
      total += data.val();
      if(data.val() > frequencyOfAction){
        highestFreqAction = data.key();
        frequencyOfAction = data.val();
      }
    });
  }
  if(total == 0){
    frequencyOfAction = 0;
  }
  frequencyOfAction = ((frequencyOfAction * 100)/total).toFixed(2);
  return frequencyOfAction;
}


// ON BEFORE REQUEST
chrome.webRequest.onBeforeRequest.addListener(function(info){
  if(user_loggedin)
  {

    // console.log('taburl');
    // console.log(taburl);

    if(taburl !== null && taburl !== undefined){
       var domain = getDomain(taburl);
    }else
      return;

    var url_thirdparty = info.url;
    var url = getDomain(url_thirdparty);

    var parts = url.split('.');
    var subdomain = parts.shift();
    var sndleveldomain = parts.slice(-2).join('.');

    if(domain.indexOf(sndleveldomain) == -1){

      console.log("On before request Inspecting WebRequest to third party website " + url_thirdparty + " for possible PPI leak.");

      //parse the URL using regex
      var regex = /[?|&]([^&#=]+)=([^&#=]+)/g;
      var found;
      var params = {};

      //Check if any query value of the URL matches one of the fields of PII provided by the user
      while(found=regex.exec(url_thirdparty)){
        for(var property in user){
          if (user.hasOwnProperty(property) && typeof user[property] != 'undefined') {
            if(found[2].toString().toLowerCase()==user[property].toString().toLowerCase()){ //value being leaked matches PII saved in database
              params[found[1]] = found[2];
            }
          }
        }
      }

      if(Object.keys(params).length>0){
        var domain_thirdparty = getDomain(url_thirdparty);
          //Crowdsourcing
        var processedUrl = processURL(domain_thirdparty);
        var frequency_of_visit = getMaliciousWebsiteStats(processedUrl);

          //For all the PII values which are being leaked
        var leak = "Detected PII leak! \n\nThe website " + domain + " is leaking your ";
        for(var param in params) {
          var p = param + " - " + params[param] + "\n";
          leak+=p;
        }

        leak+= "to " ;
        leak+= domain_thirdparty;
        leak+="\n";

        if(frequencyOfAction == -1)
          var majority = "This is a new found malicious website.";
        else
          var majority = frequencyOfAction + "% of users have choosen " + highestFreqAction + "." ;

        // Check if the user visited the URL in the past
        var is_visited = is_website_visited(domain_thirdparty);
        var prev_action;

        if(is_visited){
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: Yes');
          prev_action = 'True';
        }else{
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: No');
          prev_action = 'False';
        }

        var message = leak + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";
        var action = prompt(message + "Enter 1 to allow, 2 to block and 3 to scrub", "3");

        if(action == "1")
          action = "allow";
        else if(action == "2")
          action = "deny";
        else if(action == "3")
          action ="scrub";
        else
          action = "allow"; //default behavior

        updateUserWebsiteInfo(processedUrl, action);
        updateCrowdSourcingWebsiteInfo(processedUrl, action);

        if(action == "scrub"){
          // scrub
          //DecodeURI component twice to decode the url propoerly to contain '@' sign for email
          info.url = decodeURIComponent(info.url);
          info.url = decodeURIComponent(info.url);

          for(var param in params) {
            var p = params[param];
            info.url = info.url.replace(p, 'xxxx');
          }

          return {redirectUrl: info.url};
        }
        else if(action == "deny"){
          // block
          return {cancel:true};
        }
      }
    }
  }
},
// filters
{
  urls: ["<all_urls>"],
  types: ["main_frame", "sub_frame", "object", "xmlhttprequest","other"] //filtering the type of requests
},
// extraInfoSpec
["blocking"]);



// ON BEFORE SEND HEADERS
chrome.webRequest.onBeforeSendHeaders.addListener(function(info){

  if(user_loggedin){

    console.log('user logged in 2');
    console.log(user_loggedin);

    // console.log('taburl');
    // console.log(taburl);


    if(taburl !== null && taburl !== undefined){
       var domain = getDomain(taburl);
    }else{
      return;
    }

    var url_thirdparty = info.url;
    var url = getDomain(url_thirdparty);

    var parts = url.split('.');
    var subdomain = parts.shift();
    var sndleveldomain = parts.slice(-2).join('.');

    if(domain.indexOf(sndleveldomain) == -1){
      console.log("Inspecting WebRequest to third party website " + url_thirdparty + " for possible PPI leak.");

      if(prev_request != undefined && prev_request.url == info.url && prev_request.type == info.type && prev_request.frameId != info.frameId){

        return;
      }

      //parse the URL using regex
      var regex = /[?|&]([^&#=]+)=([^&#=]+)/g;
      var found;
      var params = {};

      for (var i = 0; i < info.requestHeaders.length; ++i) {
        //Check for cookie
        if (info.requestHeaders[i]!=undefined && info.requestHeaders[i]!=null && info.requestHeaders[i].name === 'Cookie') {
            var cookie = info.requestHeaders[i].value.split(';');
            for(var j=0; j<cookie.length; j++) {
                var p = cookie[j].split('=');
                for(var property in user) {
                   if (user.hasOwnProperty(property) && typeof user[property] != 'undefined') {
                      if(p[1].toString().toLowerCase()==user[property].toString().toLowerCase()){ //value being leaked matches PII saved in database
                         params[p[0]] = p[1];
                      }
                   }
                }
            }
        }

        //Check for Referrer header
        if (info.requestHeaders[i]!=undefined && info.requestHeaders[i]!=null && info.requestHeaders[i].name === 'Referer') {
            var referer = decodeURIComponent(info.requestHeaders[i].value);
            while(found=regex.exec(referer)){
               for(var property in user){
                  if (user.hasOwnProperty(property) && typeof user[property] != 'undefined') {
                     if(found[2].toString().toLowerCase()==user[property].toString().toLowerCase()){ //value being leaked matches PII saved in database
                       params[found[1]] = found[2];
                     }
                  }
               }
            }
         }
      }

      if(Object.keys(params).length>0){

        prev_request = info;

        var domain_thirdparty = getDomain(url_thirdparty);

        //Crowdsourcing
        var processedUrl = processURL(domain_thirdparty);
        var frequency_of_visit = getMaliciousWebsiteStats(processedUrl);

        //For all the PII values which are being leaked
        var leak = "Detected PII leak! \n\nThe website " + domain + " is leaking your ";
        for(var param in params) {
          var p = param + " - " + params[param] + "\n";
          leak+=p;
        }
        leak+= "to " ;
        leak+= domain_thirdparty;
        leak+="\n";

        if(frequencyOfAction == -1){
          var majority = "This is a new found malicious website.";
        } else{
          var majority = frequencyOfAction + "% of users have choosen " + highestFreqAction + "." ;
        }

        // Check if the user visited the URL in the past
        var is_visited = is_website_visited(domain_thirdparty);
        var prev_action;

        if(is_visited){
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: Yes');
          prev_action = 'True';
        }else{
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: No');
          prev_action = 'False';
        }

        var message = leak + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";


        var action = prompt(message + "Enter 1 to allow, 2 to block and 3 to scrub", "3");

        if(action == "1")
          action = "allow";
        else if(action == "2")
          action = "deny";
        else if(action == "3")
          action ="scrub";
        else
          action = "allow"; //default behavior

        updateUserWebsiteInfo(processedUrl, action);
        updateCrowdSourcingWebsiteInfo(processedUrl, action);

        if(action == "scrub"){
          // scrub
          var referer_header_index;
          var referer_value;


          //DecodeURI component twice to decode the url propoerly to contain '@' sign for email
          info.url = decodeURIComponent(info.url);
          info.url = decodeURIComponent(info.url);

          for (var i = 0; i < info.requestHeaders.length; ++i) {
            if(info.requestHeaders[i].name == 'Referer'){
              referer_value = decodeURIComponent(info.requestHeaders[i].value);
              referer_header_index = i;
              break;
            }
          }

          for(var param in params) {
            var p = params[param];
            info.url = info.url.replace(p, 'xxxx');
            if(referer_value != undefined)
              referer_value = referer_value.replace(p, 'xxxx');
          }


          if(referer_value != undefined){
            referer_value = encodeURIComponent(referer_value);
            info.requestHeaders[referer_header_index].value = referer_value;
          }

          // info.url = encodeURIComponent(info.url);
          console.log(info);
          return {requestHeaders: info.requestHeaders};
        }
        else if(action == "deny"){
          // block
          console.log('block');
          return {cancel:true};
        }

      }
    }
  }
},
// filters
{
  urls: ["<all_urls>"],
  types: ["main_frame", "sub_frame", "object", "xmlhttprequest","other"] //filtering the type of requests
},
// extraInfoSpec
["requestHeaders", "blocking"]);



function is_website_visited(website){
  var url;
  website = website.toLowerCase();

  for(var key in browsing_data){
   var obj = browsing_data[key];
   url = getDomain(obj.url);
   url = url.toLowerCase();
   if(website.indexOf(url.toLowerCase()) != -1)
      return true;
  }
  return false;
}

function processURL(url){
  var re = /[\.]{1}/g;
  return url.replace(re, '_dot_');
}

// This function checks if URL was visited before by the user, if it was visited then returns action take otherwise returns
function checkIfVisited(url){
    urlModified = processURL(url);
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
    var websiteJson = new Object();
    websiteJson[url] = action;

    if(typeof user.website == "undefined") {
        var currentUserRefUrl = UserRefUrl + '/' + user.id;
        var json = new Object();
        json['website'] = websiteJson;
        currentUserRef = new Firebase(currentUserRefUrl);
        currentUserRef.update(json);
    } else {
      var websiteRefUrl = UserRefUrl + '/' + user.id + '/' + 'website';
      var websiteRef = new Firebase(websiteRefUrl);
      websiteRef.update(websiteJson);
    }

}


function updateCrowdSourcingWebsiteInfo(url, action){
  var websiteRef = websiteInfoRef.child(url);
  var websiteSnapshot = global_snapshot.child(url);
  var websiteInfoJson = new Object();

  if(websiteSnapshot.val() != null){
    var websiteData = websiteSnapshot.val();
    websiteData[action] += 1;
    websiteRef.update(websiteData);
    } else{
    var websiteJson = new Object();
    websiteInfoJson["allow"] = 0;
    websiteInfoJson["deny"] = 0;
    websiteInfoJson["scrub"] = 0;
    websiteInfoJson[action] = 1;
    websiteJson[url] = websiteInfoJson;
    websiteInfoRef.update(websiteJson);
  }
}
