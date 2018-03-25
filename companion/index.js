/*
 * Entry point for the companion app
 */

import { settingsStorage } from "settings";
import { outbox } from "file-transfer";

import * as messaging from "messaging";

function extractSetting(settingName, defaultValue, typeMap = val => Number(val)) {
  if (!settingsStorage.getItem(settingName)) {
    settingsStorage.setItem(settingName, defaultValue)
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

//todo update this to not send an update to the client on each setting extraction
// just once settings are done extracting
function getSettings() {
  shouldNotify = false
  let settings = {
      hour: extractSetting('hour', 8),
      minute: extractSetting('minute', 30),
      steps: extractSetting('steps', 50),
      showHeartRate: extractSetting('showheartrate', true, mapToBoolean),
      disableAlarm: extractSetting('disableAlarm', false, mapToBoolean),
      showBatteryLevel: extractSetting('showBatteryLevel', true, mapToBoolean),
      adjustBrightness: extractSetting('adjustBrightness', true, mapToBoolean),
      logocounting: extractSetting('logocounting', true, mapToBoolean),
      bedtime: extractSetting('bedtime', 22),
      showWakeupImage: extractSetting('showWakeupImage', true, mapToBoolean),
      silentInProgress: extractSetting('silentInProgress', true, mapToBoolean)
    }
  shouldNotify = true
  return settings
}

const UNSPLASH_RANDOM_URL = "https://api.unsplash.com/photos/random?query=sunrise&w=348&h=250&client_id=e726195f8bf03b737757c53dde3d25fc92ebba58571c7600760102006cae3d9d"

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
    console.log(`Value changed: ${evt.key}: ${evt.newValue}`)
    settingsStorage.setItem(evt.key, evt.newValue)

    let settings = getSettings()
    
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
    messaging.peerSocket.send(getSettings());
    //until we, have then stop
    clearInterval(settingsSendInterval);
  }
}, 10 * 1000)
