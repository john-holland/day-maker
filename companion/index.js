
/*
 * Entry point for the companion app
 */

import { settingsStorage } from "settings";
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
    
    messaging.peerSocket.send(settings);
  } else {
    console.log("companion - no connection");
  }
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
