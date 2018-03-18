/*
 * Entry point for the companion app
 */

import { settingsStorage } from "settings";

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

function getSettings() {
  return {
      hour: extractSetting('hour', 8),
      minute: extractSetting('minute', 30),
      steps: extractSetting('steps', 50),
      showHeartRate: extractSetting('showheartrate', true, mapToBoolean),
      disableAlarm: extractSetting('disableAlarm', false, mapToBoolean),
      showBatteryLevel: extractSetting('showBatteryLevel', true, mapToBoolean)
    }
}

settingsStorage.onchange = function(evt) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    console.log(`Value changed: ${evt.key}: ${evt.newValue}`)
    settingsStorage.setItem(evt.key, evt.newValue)
    messaging.peerSocket.send(getSettings());
  } else {
    console.log("companion - no connection");
  }
}

//Try every minute to update the settings of the app...
let settingsSendInterval = setInterval(function() {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(getSettings());
    //until we, have then stop
    clearInterval(settingsSendInterval);
  }
}, 10 * 1000)


















































