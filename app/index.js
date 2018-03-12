import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { UserInterface } from "./ui.js";
import { Alarm } from "../common/alarm";
import * as messaging from "messaging";
import { today } from "user-activity"
import { vibration } from "haptics"

/**
Improvements:
 we could create a modal display for the steps when the alarm is active
 probably we could make some architectural improvements
   this could be useful: https://github.com/gaperton/ionic-views
*/

let updateReceived = false;

let ui = new UserInterface();

let test = () => {
  let alarm = new Alarm()
  alarm.dayBuzzed = 4
  alarm.hour = 8
  alarm.minute = 30
  alarm.stepsSinceStart = -1
  
  let previousDayBuzz = ui.alarmShouldBuzz({ getDay: () => 5})
  
  return JSON.stringify({
    previousDay: `expected true, got: ${previousDayBuzz}`
  })
}

//console.log(tests())

// Update the clock every minute
clock.granularity = "seconds";//"minutes";
let alarmTimeoutId = undefined;
let alarmInterval = function() {
  if ((updateReceived || ui.obtainedSettings) && ui.alarm.alarmShouldBuzz()) {
    clock.granularity = "seconds";
    ui.alarm.buzz();
    console.log(`buzzing, steps to go: ${ui.alarm.stepsToGo()}`)
  }
  
  console.log(`interval time: ${ui.alarm.getTimeoutIntervalDuration() / 1000 / 60} minutes`)
  alarmTimeoutId = setTimeout(alarmInterval, ui.alarm.getTimeoutIntervalDuration());
}

alarmInterval();

// Listen for the onmessage event
messaging.peerSocket.onmessage = function(evt) {
  let data = evt.data
  console.log(JSON.stringify(data))

  ui.alarm.saveAlarmData(data)

  updateReceived = true
  
  if (alarmTimeoutId !== undefined) clearTimeout(alarmTimeoutId)
  alarmInterval()
  
  console.log('updated')
}

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date

  ui.render({ today, updateReceived })
}