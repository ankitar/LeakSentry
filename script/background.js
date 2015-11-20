// global variables
var UserRefUrl = 'https://leaksentry.firebaseio.com/users';
var userRef = new Firebase('https://leaksentry.firebaseio.com/users');
var websiteInfoRef = new Firebase('https://leaksentry.firebaseio.com/websiteInfo')
var user;
var highestFreqAction;
var frequencyOfAction = -1;
var browsing_data;
var global_snapshot;

//get snapshot
websiteInfoRef.on('value', function(snapshot){
  global_snapshot = snapshot;
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

  frequencyOfAction = ((frequencyOfAction * 100)/total);    
  return frequencyOfAction;
}

chrome.webRequest.onBeforeSendHeaders.addListener(function(info){
    if(taburl !== null && taburl !== undefined){
       var domain = getDomain(taburl);
    }

    var url_thirdparty = info.url;

    if(url_thirdparty.indexOf(domain) == -1){
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

      // console.log(params);

      if(Object.keys(params).length>0){
        var domain_thirdparty = getDomain(url_thirdparty);

        //Crowdsourcing
        var processedUrl = processURL(domain_thirdparty);
        var frequency_of_visit = getMaliciousWebsiteStats(processedUrl, leak, prev_action);
        
        if(frequencyOfAction == -1){
          var majority = "This is a new found malicious website.";
        } else{
          var majority = frequencyOfAction + "% of users have choosen " + highestFreqAction + "." ;
        }
        var message = leak + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";


        console.log('frequency of visit');
        console.log(frequency_of_visit); 

        var has_visited;

        //For all the PII values which are being leaked
        var leak = "Identified leak! The website " + domain + " is leaking your ";
        for(var param in params) {
          var p = param + " - " + params[param] + "; ";
          leak+=p;
        }
        leak+= " to " ;
        leak+= domain_thirdparty;
        
        console.log('leak');
        console.log(leak);


        // Check if the user visited the URL in the past
        has_visited = checkIfVisited(domain_thirdparty);
        var prev_action = false;
        if(has_visited!=null){
          prev_action = true;
          // console.log("You have visited " + domain_thirdparty + " and " + has_visited + " it.");
        }

        var is_visited = is_website_visited(domain_thirdparty);
        
        console.log('info');
        console.log(info);
      
        if(is_visited)
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: Yes');
        else
          console.log('Third Party Website ' + domain_thirdparty + 'visited before: No');

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
          for(var param in params) {
            var p = params[param];
            info.url = info.url.replace(p, 'xxxx');
          }
          console.log(info);
        }
        else if(action == "deny"){
          // block
          console.log('block');
          return {cancel:true};
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
  if(websiteSnapshot != null){
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



// update the crowdsourcing websiteInfo database on the basis of action taken by user

// function updateCrowdSourcingWebsiteInfo(url, action){
//   var websiteInfoJson = new Object();
//   websiteInfoRef.orderByChild(url).once('value', function(snapshot){
//     var websiteSnapshot = snapshot.val();
//     if(websiteSnapshot != null && websiteSnapshot.hasOwnProperty(url)){
//       var websiteRef = websiteInfoRef.child(url);
//       var websiteData = snapshot.val();
//       var value = websiteData[url]
//       ;
//       value[action] += 1;
//       websiteRef.update(value);
//       } else{
//       var websiteJson = new Object();
//       websiteInfoJson["allow"] = 0;
//       websiteInfoJson["deny"] = 0;
//       websiteInfoJson["scrub"] = 0;
//       websiteInfoJson[action] = 1;
//       websiteJson[url] = websiteInfoJson;
//       websiteInfoRef.update(websiteJson);
//     }
//   });
// }


// callback function to be executed after getting snapshot of crowd source data of third party url
// function userActionPromptBox(leak, prev_action, processedUrl){
//   if(frequencyOfAction == -1){
//     var majority = "This is a new found malicious website.";
//   } else{
//     var majority = frequencyOfAction + "% of users have choosen " + highestFreqAction + "." ;
//   }
//   var message = leak + "\n" + "Visited Before: " + prev_action + "\n" + "Community: " + majority + "\n\n";
//   var action = prompt(message + "Enter 1 to allow, 2 to block and 3 to scrub", "3");

//   if(action == "1"){
//     action = "allow";
//   } else if(action == "2"){
//     action = "deny";
//   } else if(action == "3"){
//     action ="scrub";
//   } else {
//     action = "allow";
//   }

//   updateUserWebsiteInfo(processedUrl, action);
//   updateCrowdSourcingWebsiteInfo(processedUrl, action);

//   if(action == "3"){
  
//     for(var param in params) {
//       var p = params[param];
//       info.url = info.url.replace(p, 'xxxx');
//     }
//     console.log(info);
//   }
//   else if(action == "2"){
  
//     console.log('block');
//     return {cancel:true};
//   }
// }

  
//   },
  
//   {
//     urls: ["<all_urls>"],
//     types: ["main_frame", "sub_frame", "object", "xmlhttprequest","other"] //filtering the type of requests
//   },
//   // extraInfoSpec
//   ["requestHeaders", "blocking"]);


// websiteinfo
// function getMaliciousWebsiteStats(websiteName, leak, prev_action, callback){
//   var websiteRef = websiteInfoRef.child(websiteName);
//   websiteRef.once('value', function(snapshot){
//     frequencyOfAction = -1;
//     var total = 0;
//     if(snapshot.val() != null){
//       snapshot.forEach(function(data){
//           total += data.val();
//           if(data.val() > frequencyOfAction){
//             highestFreqAction = data.key();
//             frequencyOfAction = data.val();
//         }
//       });
//       frequencyOfAction = ((frequencyOfAction * 100)/total);
//     }
//     callback(leak, prev_action, websiteName);
//   });
// }