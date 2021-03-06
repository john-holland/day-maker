
/*
 * Entry point for the companion app
 */

import { settingsStorage } from "settings";
import { localStorage } from 'local-storage';
import { outbox } from "file-transfer";
import { device } from "peer";

import * as messaging from "messaging";

function extractSetting(settingName, defaultValue, typeMap = val => Number(val)) {
  if (!settingsStorage.getItem(settingName)) {
    console.log('default: ' , defaultValue)
    settingsStorage.setItem(settingName, JSON.stringify(defaultValue))
    return defaultValue
  }
  
  let setting = settingsStorage.getItem(settingName)
  
  if (setting && String(setting).charAt(0) === '{') {
    return typeMap(JSON.parse(settingsStorage.getItem(settingName)).name)
  } else {
    return typeMap(settingsStorage.getItem(settingName))
  }
}

function mapToBoolean(val) {
  return (typeof val === 'boolean' && val) || val == 'true'
}

let shouldNotify = true

function extractTime(settingName, defaultTime) {
  let time = extractSetting(settingName, defaultTime, val => val)
  
  if (!time) {
    time = defaultTime
  } 
  
  if (time && time.indexOf(':') > 0) {
    let splitTime = time.split(':')
    return {
      hour: Number(splitTime[0]),
      minute: Number(splitTime[1])
    }
  }
  
  return {
    hour: Number(time),
    minute: 0
  }
}

//todo update this to not send an update to the client on each setting extraction
// just once settings are done extracting
function getSettings() {
  shouldNotify = false
  
  let bedtime = extractTime('bedtime', '22:00')
  bedtime = bedtime.hour * 60 + bedtime.minute
  
  let settings = {
      hour: extractSetting('hour', 8),
      minute: extractSetting('minute', 30),
      steps: extractSetting('steps', 50),
      showHeartRate: extractSetting('showheartrate', true, mapToBoolean),
      disableAlarm: extractSetting('disableAlarm', false, mapToBoolean),
      alarmEnabled: extractSetting('alarmEnabled', true, mapToBoolean),
      showBatteryLevel: extractSetting('showBatteryLevel', true, mapToBoolean),
      adjustBrightness: extractSetting('adjustBrightness', true, mapToBoolean),
      logocounting: extractSetting('logocounting', true, mapToBoolean),
      bedtime: bedtime,
      showWakeupImage: extractSetting('showWakeupImage', true, mapToBoolean),
      silentInProgress: extractSetting('silentInProgress', true, mapToBoolean)
    }
  shouldNotify = true
  return settings
}

let width = device.modelName === 'Ionic' ? 348 : 300
let height = device.modelName === 'Ionic' ? 250 : 300

let UNSPLASH_RANDOM_URL = `https://api.unsplash.com/photos/random?query=sunrise&w=${width}&h=${height}&client_id=e726195f8bf03b737757c53dde3d25fc92ebba58571c7600760102006cae3d9d`

const destFilename = 'background.jpg'
let obtainedNewBackground = undefined

let tryGetNewBackgroundImage = () => {  
  let now = new Date().getTime()
  //wait at least an hour before retrieving a new background
  if (obtainedNewBackground !== undefined && (now / 1000 / 60 - obtainedNewBackground) > 60) return

  fetch(UNSPLASH_RANDOM_URL)
    .then(response => response.json())
    .then(json => 
        fetch(json.urls.small).then(response => {
          // We need an arrayBuffer of the file contents
            return response.arrayBuffer();
          }).then(data => {
            outbox.enqueue(destFilename, data).then((ft) => {
              console.log("Transfer of '" + destFilename + "' successfully queued.");
              obtainedNewBackground = now
            })
            .catch(error => {
              throw new Error("Failed to queue '" + destFilename + "'. Error: " + error)
            })
        })
        .catch(error => console.log("ERROR: ", error)));
}

settingsStorage.onchange = function(evt) {
  if (!shouldNotify) {
    return
  }
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    if (evt.key === null) return
    console.log(`Value changed: ${evt.key}: ${evt.newValue}`)
    settingsStorage.setItem(evt.key, evt.newValue)
    
    let settings
    try {
     settings = getSettings() 
    } catch (e) {
      console.log("error from getSettings", e)
    }
    
    if (settings.showWakeupImage) tryGetNewBackgroundImage()
    
    messaging.peerSocket.send({ name: 'settings', data: settings });
  } else {
    console.log("companion - no connection");
  }
}

messaging.peerSocket.onmessage = function({data}) {  
  let { name, dat } = data
  
  if (name === 'settings') {
    _.keys(dat).forEach(key => settingsStorage.setItem(key, dat[key]))
  } else if (name === 'training') {
    console.log('received new training data')
      
    persistData(dat)
    //save data locally:
    //  https://dev.fitbit.com/build/reference/companion-api/storage/ 
    //then:
    //upload to server
    //  https://dev.fitbit.com/build/reference/companion-api/fetch/
    // or start polling every 15 minutes to try to send this data
    
    // it is tempting to use https://dev.fitbit.com/build/reference/device-api/user-profile/ as an id
    // as of now no unique device id is available, could use guid lib or request 2 factor auth in settings page,
    //  then retrieve from profile
  }
}

let persistIntervalId = undefined
let FIFTEEN_MINUTES = 15 * 60 * 1000

function persistData(data) {
  let unsenttraining = settingsStorage.getItem('unsenttraining')
  unsenttraining = !!unsenttraining ?  unsenttraining.concat(data) : data
  
  postData('https://relz8bq5l9.execute-api.eu-west-1.amazonaws.com/production/', data, 'PUT')
    .then(error => {
      clearInterval(persistIntervalId)
      persistIntervalId = undefined
      settingsStorage.setItem('unsenttraining', [])
    }).catch(error => {
      persistIntervalId = setInterval(() => persistData(unsenttraining), FIFTEEN_MINUTES)
      settingsStorage.setItem('unsenttraining', unsenttraining)
    })
}

let getShowWakeupImage = () => extractSetting('showWakeupImage', true, mapToBoolean)
//Try every minute to update the settings of the app...
let settingsSendInterval = setInterval(function() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    if (getShowWakeupImage()) tryGetNewBackgroundImage()
    let settings
    try {
      settings = getSettings() 
    } catch (e) {
      console.log("error from getSettings", e)
    }
    messaging.peerSocket.send(settings);
    //until we, have then stop
    clearInterval(settingsSendInterval);
  }
}, 10 * 1000)

function postData(url = ``, data = {}, method = 'POST') {
  // Default options are marked with *
    return fetch(url, {
        method: method, // *GET, POST, PUT, DELETE, etc.
        //mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        //credentials: "*", // include, same-origin, *omit
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // "Content-Type": "application/x-www-form-urlencoded",
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
    .then(response => response.json()); // parses response to JSON
}