// global variables
var UserRefUrl = 'https://leaksentry.firebaseio.com/users';
var userRef = new Firebase('https://leaksentry.firebaseio.com/users');
var websiteInfoRef = new Firebase('https://leaksentry.firebaseio.com/websiteInfo')
var user;
var highestFreqAction;
var frequencyOfAction = -1;

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

// websiteinfo
function getMaliciousWebsiteStats(websiteName, leak, prev_action, callback){
  var websiteRef = websiteInfoRef.child(websiteName);
  websiteRef.once('value', function(snapshot){
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
      frequencyOfAction = ((frequencyOfAction * 100)/total);
    }
    callback(leak, prev_action, websiteName);
  });
}

chrome.webRequest.onBeforeSendHeaders.addListener(function(info) {

    if(taburl !== null && taburl !== undefined){
       var domain = getDomain(taburl);
    }

    var url_thirdparty = info.url;
    if(!url_thirdparty.indexOf(domain) != -1){

    console.log("Inspecting WebRequest to third party website " + url_thirdparty + " for possible PPI leak.");

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

    for (var i = 0; i < info.requestHeaders.length; ++i) {

        if (info.requestHeaders[i].name === 'Cookie') {
            console.log("Inspecting WebRequest cookies requestHeader for possible PPI leak through.");

            //parse the cookie to get name value pairs
            var cookie = info.requestHeaders[i].value.split(';');
            //var test = "name=komal; phone=3476226844; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/";
            //var cookie = test.split(';');

            for(var i=0; i<cookie.length; i++) {
                var p = cookie[i].split('=');
                for(var property in user) {
                   if (user.hasOwnProperty(property)) {
                      if(p[1]==user[property]){ //value being leaked matches PII saved in database
                         params[p[0]] = p[1];
                      }
                   }
                }
            }
            break;
        }
    }

    console.log(params);

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
        var processedUrl = processURL(domain_thirdparty);
        getMaliciousWebsiteStats(processedUrl, leak, prev_action, userActionPromptBox);
    }

}

// callback function to be executed after getting snapshot of crowd source data of third party url
function userActionPromptBox(leak, prev_action, processedUrl){
  if(frequencyOfAction == -1){
    var majority = "This is a new found malicious website.";
  } else{
    var majority = frequencyOfAction + "% of users have choosen " + highestFreqAction + "." ;
  }
  var message = leak + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";
  var action = prompt(message + "Enter 1 to allow, 2 to block and 3 to scrub", "3");

  if(action == "1"){
    action = "allow";
  } else if(action == "2"){
    action = "deny";
  } else if(action == "3"){
    action ="scrub";
  } else {
    action = "allow"; //default behavior
  }

  updateUserWebsiteInfo(processedUrl, action);
  updateCrowdSourcingWebsiteInfo(processedUrl, action);

  if(action == "3"){
    // scrub
    for(var param in params) {
      var p = params[param];
      info.url = info.url.replace(p, 'xxxx');
    }
    console.log(info);
  }
  else if(action == "2"){
    // block
    console.log('block');
    return {cancel:true};
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

// update the crowdsourcing websiteInfo database on the basis of action taken by user

function updateCrowdSourcingWebsiteInfo(url, action){
  var websiteInfoJson = new Object();
  
  websiteInfoRef.orderByChild(url).once('value', function(snapshot){
    var websiteSnapshot = snapshot.val();
    if(websiteSnapshot != null && websiteSnapshot.hasOwnProperty(url)){
      var websiteRef = websiteInfoRef.child(url);
      var websiteData = snapshot.val();
      var value = websiteData[url];
      value[action] += 1;
      websiteRef.update(value);
      } else{
      var websiteJson = new Object();
      websiteInfoJson["allow"] = 0;
      websiteInfoJson["deny"] = 0;
      websiteInfoJson["scrub"] = 0;
      websiteInfoJson[action] = 1;
      websiteJson[url] = websiteInfoJson;
      websiteInfoRef.update(websiteJson);
    }
  });
}
