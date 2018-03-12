//import document from "document"
import { preferences } from "user-settings"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { battery, charger } from "power";
import { HeartRateSensor } from "heart-rate";

const ALARM_HOUR = "hours"
const ALARM_MINUTE = "minutes"
const ALARM_STEPS = "steps"

const WAKEUP_CALLOUTS = [
  'WAKE UP!',
  'GET WALKIN\'!',
  'MOVE IT MOVE IT!',
  'WALK IT OFF!!'
]

let document = require("document");

function is12Hour() {
  return preferences.clockDisplay === "12h"
}

function getWakeupCallout() {
  return WAKEUP_CALLOUTS[Math.floor(Math.random() * WAKEUP_CALLOUTS.length)]
}

function getDayAbbreviation(day) {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day]
}

export class UserInterface {
  alarm = new Alarm()
  obtainedSettings = false

  constructor() {
    try {
      this.alarm.loadSettings() 
      this.obtainedSettings = true
    } catch (e) {
      console.log('failed to read settings', e)
    }
    
    this.stepGoalEl = document.getElementById("stepGoal")
    this.calorieGoalEl = document.getElementById("calorieGoal")
    this.floorsGoalEl = document.getElementById("floorsGoal")
    this.activeMinutesGoalEl = document.getElementById("activeMinutesGoal")
    this.batteryEl = document.getElementById("battery")
    
    this.dateEl = document.getElementById("date")
    this.heartRateDateEl = document.getElementById("heartRateDate")
    this.heartRateEl = document.getElementById("heartRate")
  }

	render({ today, updateReceived }) {
		let hours = today.getHours()
		let minutes = today.getMinutes()
		let steps = this.alarm.buzzing ? this.alarm.stepsToGo() : this.alarm.steps

    if (minutes === 0) {
      minutes = "00"
    } else [
      minutes = util.zeroPad(minutes)
    ]
    
		if (is12Hour()) {
			if (hours > 12) {
        hours = hours % 12 || 12
				minutes += " pm"
			} else {
				minutes += " am"
			}
      
      if (hours === 0) {
        hours = "12"
      }
		}
    
    document.getElementById("time").text = `${hours}:${minutes}`
    let dateString = `${getDayAbbreviation(today.getDay())} ${today.getDate()}`
    
    if (this.alarm.showHeartRate) {
      if (!this.heartRateMonitor) {
        let hrm = this.heartRateMonitor = new HeartRateSensor()
        let hrmEl = this.heartRateEl
        let self = this
        this.hrmCleanupTimeoutId = null
        this.heartRateMonitor.onreading = function(e) {
          if (!self.heartRateMonitor) return
          
          let heartrate = hrm.heartRate ? hrm.heartRate : '--'
          hrmEl.text = `${heartrate}`
          
          if (self.hrmCleanupTimeoutId) {
            //we don't want to keep getting heart rate while the watchface isn't being rendered,
            // so we'll set a timeout for a minute assuming someone might want to glance back at their hr
            clearTimeout(self.hrmCleanupTimeoutId)
          }
          
          self.hrmCleanupTimeoutId = setTimeout(() => {
            if (!self.heartRateMonitor) { 
              return 
            }
            hrmEl.text = '--'
            self.heartRateMonitor.stop()
            self.heartRateMonitor = null
          }, 60 * 1000)
        }
        this.heartRateMonitor.start()
      }
      
      this.showHeartRate()
      document.getElementById("heartRateDate").text = dateString
    } else {
      if (this.heartRateMonitor) {
        this.heartRateMonitor.stop()
        this.heartRateMonitor = null
      }

      this.hideHeartRate()
      document.getElementById("date").text = dateString
    }
    
    this.renderGoals();

 		if (!updateReceived && !this.obtainedSettings) {
       document.getElementById("message").text = "Open App to set alarm"
    } else if (this.alarm.alarmShouldBuzz()) {
			document.getElementById("message").text = steps + " " + getWakeupCallout()
    } else {
      document.getElementById("message").text = `${steps} steps at ${this.alarm.hour}:${util.zeroPad(this.alarm.minute)}`
    }
	}

  showHeartRate() {
    this.dateEl.style.visibility = "hidden"
    this.heartRateDateEl.style.visibility = "visible"
    this.heartRateEl.style.visibility = "visible"
  }

  hideHeartRate() {
    this.dateEl.style.visibility = "visible"
    this.heartRateDateEl.style.visibility = "hidden"
    this.heartRateEl.style.visibility = "hidden"
  }

  renderGoals() {
    let boundingBox = document.getElementById("background").getBBox()
    
    let stepGoalColor = "#4cc2c4"
    let calorieGoalColor = "#E258A6"
    let floorsGoalColor = "#FFE463"
    let activeMinutesGoalColor = "#FFAA63"
    let goalCompleteColor = "fb-green"
    
    let stepGoalPercentage = Math.min((todayActivity.local.steps || 0) / (goals.steps || 1), 1)
    let caloriesGoalPercentage = Math.min((todayActivity.local.calories || 0) / (goals.calories || 1), 1)
    let floorsGoalPercentage = Math.min((todayActivity.local.elevationGain || 0) / (goals.elevationGain || 1), 1)
    let activeMinutesGoalPercentage = Math.min((todayActivity.local.activeMinutes || 0) / (goals.activeMinutes || 1), 1)

    this.batteryEl.width = Math.floor(battery.chargeLevel) / 100 * boundingBox.width
    this.batteryEl.style.fill = charger.connected ? "chartreuse" : "fb-aqua"

    this.stepGoalEl.x = boundingBox.x
    this.stepGoalEl.width = stepGoalPercentage * boundingBox.width
    this.calorieGoalEl.x = boundingBox.x
    this.calorieGoalEl.width = caloriesGoalPercentage * boundingBox.width
    this.floorsGoalEl.x = boundingBox.x
    this.floorsGoalEl.width = floorsGoalPercentage * boundingBox.width
    this.activeMinutesGoalEl.x = boundingBox.x
    this.activeMinutesGoalEl.width = activeMinutesGoalPercentage * boundingBox.width
    
    this.stepGoalEl.style.fill = (stepGoalPercentage < 1) ? stepGoalColor : goalCompleteColor
    this.calorieGoalEl.style.fill = (caloriesGoalPercentage < 1) ? calorieGoalColor : goalCompleteColor
    this.floorsGoalEl.style.fill = (floorsGoalPercentage < 1) ? floorsGoalColor : goalCompleteColor
    this.activeMinutesGoalEl.style.fill = (activeMinutesGoalPercentage < 1) ? activeMinutesGoalColor : goalCompleteColor
  }
}
