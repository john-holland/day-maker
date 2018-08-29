import { today } from "user-activity"
import { vibration } from "haptics"
import { readFileSync, statSync, writeFileSync } from "fs";

const SETTINGS_FILENAME = "settings.json"
const LAST_KNOWN_ALARM = "LAST_KNOWN_ALARM"
const VIBRATIONS = [
    "ring",
    "nudge-max"
  ]

function getVibration() {
  return VIBRATIONS[Math.floor(Math.random() * VIBRATIONS.length)]
}

function dateProvider() {
  return new Date()
}

function getCurrentStepCount() {
	return today.local.steps || 0
}

function getCurrentDay() {
  return (new Date()).getDay()
}



export class Alarm {
  stepsSinceStart = getCurrentStepCount()
  buzzing = false
  dayBuzzed = -1 // i don't love -1 as initialization values, but getDate() returns 0-6
  
	constructor({ hour = 8, minute = 0, steps = 50, 
                showHeartRate = true, disableAlarm = false, 
                showBatteryLevel = true, adjustBrightness = true,
                bedtime = 23, logocounting = true, showWakeupImage = true,
                silentInProgress = true } = {}) {
    
		this.hour = hour
		this.minute = minute
		this.steps = steps
    this.showHeartRate = showHeartRate
    this.disableAlarm = disableAlarm
    this.showBatteryLevel = showBatteryLevel
    this.adjustBrightness = adjustBrightness
    this.bedtime = bedtime
    this.logocounting = logocounting
    this.showWakeupImage = showWakeupImage
    this.silentInProgress = silentInProgress
  }

  loadSettings() {
    let settings = readFileSync(SETTINGS_FILENAME, "utf-8")
    let { hour, minute, steps, 
          showHeartRate = true, 
          disableAlarm = false,
          alarmEnabled = true,
          showBatteryLevel = true, 
          adjustBrightness = true,  
          bedtime = 23,
          logocounting = true,
          showWakeupImage = true,
          silentInProgress = true
        } = JSON.parse(settings)
    
    console.log('loaded settings: ' + settings)
    this.hour = hour
    this.minute = minute
    this.steps = steps
    this.showHeartRate = showHeartRate
    this.disableAlarm = disableAlarm
    this.alarmEnabled = !disableAlarm
    this.showBatteryLevel = showBatteryLevel
    this.adjustBrightness = adjustBrightness
    this.bedtime = bedtime
    this.logocounting = logocounting
    this.showWakeupImage = showWakeupImage
    this.silentInProgress = silentInProgress
  }

	saveAlarmData({hour, minute, steps, 
                 showHeartRate, disableAlarm, 
                 showBatteryLevel, adjustBrightness, 
                 logocounting, bedtime, showWakeupImage,
                 silentInProgress, alarmEnabled}) {
    this.hour = hour
    this.minute = minute
    this.steps = steps
    this.showHeartRate = showHeartRate
    //todo: let alarmEnabled go for a release then remove
    // think about a different migration strategy
    this.disableAlarm = disableAlarm
    this.alarmEnabled = alarmEnabled
    this.showBatteryLevel = showBatteryLevel
    this.adjustBrightness = adjustBrightness
    this.bedtime = bedtime
    this.logocounting = logocounting
    this.showWakeupImage = showWakeupImage
    this.silentInProgress = silentInProgress
    
    writeFileSync(SETTINGS_FILENAME, 
      JSON.stringify({
        hour, minute, steps, 
        showHeartRate, disableAlarm, 
        showBatteryLevel, adjustBrightness,
        showWakeupImage, silentInProgress,
        alarmEnabled
      }), "utf-8")

    this.resetForUpdate()
	}

  resetForUpdate() {
    this.stepsSinceStart = -1
    this.buzzing = false
    this.dayBuzzed = -1
  }
  
	alarmShouldBuzz({getToday = dateProvider, 
                   getHours = (day) => day.getHours(), 
                   getMinutes = (day) => day.getMinutes(),
                   getDay = (day) => day.getDay()} = {}) {
    let date = getToday()
		let hour = getHours(date)
		let minute = getMinutes(date)
    let today = getDay(date)
    
    if (!this.alarmEnabled || this.disableAlarm) {
      return false
    }
    
    //we only reinitialize stepsSinceStart if the day has changed, or we get an update
    if (!this.buzzing && this.dayBuzzed !== today) {
      this.stepsSinceStart = -1
    }

    //time: 1:30 - 90, alarm: 2:00 90-120 = -30
    let diffMinutes = (hour * 60 + minute) - (this.hour * 60 + this.minute)
    //if its passed or on the alarm time, and within a half hour, or we're already ringing
    let shouldBuzz = (diffMinutes >= 0 && diffMinutes <= 30) || this.buzzing
    
		//if the time is after the current and we haven't taken enough steps
		if (shouldBuzz && this.stepsToGo() > 0) {
      return true
		}
    
    this.buzzing = false
    this.dayBuzzed = today
    
    //always turn it off if it shouldn't be vibrating
    vibration.stop()

		return false
	}

  stepsAsOf15SecondsAgo = {
    timestamp: undefined,
    steps: 0
  }

	buzz() {
		if (!this.alarmShouldBuzz()) {
			return
		}
    
    let timeInSeconds = new Date().getTime() / 1000
    if (!this.buzzing) {
      console.log('updating steps since start')
      this.stepsSinceStart = getCurrentStepCount()
      this.stepsAsOf15SecondsAgo.timestamp = timeInSeconds + 15
      this.stepsAsOf15SecondsAgo.steps = this.stepsSinceStart
    }

		this.buzzing = true
    
    if (this.silentInProgress) {
      //if we've seen no change in the last 15 seconds
      if (timeInSeconds >= this.stepsAsOf15SecondsAgo.timestamp && 
          this.stepsAsOf15SecondsAgo.steps === getCurrentStepCount()) {
        //start vibrating!
        vibration.start(getVibration())
      } else if (timeInSeconds >= this.stepsAsOf15SecondsAgo.timestamp) {
        //otherwise, just update timestamp to 15 seconds in the future
        this.stepsAsOf15SecondsAgo.steps = getCurrentStepCount()
      }
    } else {
      vibration.start(getVibration())
    }
	}

	stepsToGo() {
		if (this.stepsSinceStart < 0) {
			return this.steps
		}

    let diffSinceStart = getCurrentStepCount() - this.stepsSinceStart
		let stepsToGo = this.steps - diffSinceStart
    
    return (stepsToGo > 0) ? stepsToGo : 0
	}

  withinLogoRange() {
    let timeMinutes = this.getTimeInMinutes()
    let bedtime = this.bedtime * 60
    return this.logocounting && Math.abs(timeMinutes - bedtime) <= 30
  }

  showSunrise() {
    return this.showWakeupImage && this.buzzing
  }
  
  getTimeoutIntervalDuration() {
    const THREE_SECONDS = 3 * 1000
    const THIRTY_SECONDS = 30 * 1000
    const FIVE_MINUTES = 5 * 60 * 1000
    const TWENTY_MINUTES = 20 * 60 * 1000
    
    let date = new Date()
    
    if ((this.hour - date.getHours()) < 2) {
      if (this.alarmShouldBuzz()) {
        return THREE_SECONDS
      } else if (this.hour == date.getHours() && Math.abs(this.minute - date.getMinutes()) < 10) {
        return THIRTY_SECONDS
      }
      
      return FIVE_MINUTES
    }
    
    return TWENTY_MINUTES
  }

  getTimeInMinutes() {
    let today = new Date()
    return today.getHours() * 60 + today.getMinutes()
  }

  getAlarmTimeInMinutes() {
    return this.hour * 60 + this.minute
  }

}
