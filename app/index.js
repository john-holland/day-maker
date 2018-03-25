import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { Alarm } from "../common/alarm";
import * as messaging from "messaging";
import { today } from "user-activity"
import { vibration } from "haptics"
import { Application } from '../common/view'
import { UserInterface } from './ui'
import { StepsUI } from './views/steps'
import { CaloriesUI } from './views/calories'
import { FloorsUI } from './views/floors'
import { ActiveMinutesUI } from './views/activeminutes'
import { BatteryLevelUI } from './views/batterylevel'

/**
  think about implementing a unified timeline to allow for multiple alarms, events, calendar syncing etc
  move the DayMaker class into another file
  think about fitness / health oriented features
  get a running average battery life & display it on the battery screen?
  look at other UI patterns that could be useful for the fitbit
*/
class DayMaker extends Application {
    default = new UserInterface()
    steps = new StepsUI()
    calories = new CaloriesUI()
    floors = new FloorsUI()
    activeminutes = new ActiveMinutesUI()
    batterylevel = new BatteryLevelUI()
    timeoutId = null
    
    // Called once on application's start...
    onMount(){
        // Set initial screen.
        // Same as Application.switchTo( 'screen1' ), which might be used to switch screen from anywhere.
        //note that one consequence of accessor usage is that if you need access to this.screen during the render
        // call it won't be the currently set value, so use screens[0] instead
        this.screen = this.default
        this.screens = [this.default, this.activeminutes, this.floors, this.calories, this.steps]
        this.handlePowerLevel()
          
        document.getElementById("boundingbox").onmouseup = this.onmouseup.bind(this)
    }

    handlePowerLevel() {
      if (this.default.alarm.showBatteryLevel && this.screens.indexOf(this.batterylevel) === -1) {
        this.screens.splice(this.screens.indexOf(this.default)+1, 0, this.batterylevel)
      } else if (!this.default.alarm.showBatteryLevel && this.screens.indexOf(this.batterylevel) > -1) {
        this.screens.splice(this.screens.indexOf(this.batterylevel), 1)
      }
    }

    // Event handler, must be pinned down to the class to preserve `this`.
    onmouseup({ key }) {
      this.screens.unshift(this.screens.pop())
      Application.switchTo(this.screens[0].name)
      console.log('switching: ' + this.screens[0].name)
      if (this.timeoutId) clearTimeout(this.timeoutId)
      this.timeoutId = setTimeout(this.switchBackToDefault.bind(this), 5000)
    }

    onRender() {
      super.onRender()
      
      if (this.default.alarm.withinLogoRange() && this.previousFrame === undefined && !this.default.alarm.showSunrise()) {
        this.animateLogo(Math.random() > 0.5 ? "left" : "right") 
      }
    }

    animateLogo(direction) {
      this.logo = this.default.$('#lefttoright')
      this.logo.y = 150 + (Math.random() - .5) * 50
      this.animationDuration = 2500 + Math.random() * 7500
      
      if (direction === 'left') {
        this.logo.x = 350
        this.animateToX = -50
        this.animateToY = 150
      } else {
        this.logo.x = -50
        this.animateToX = 350
        this.animateToY = 150
      }
      
      requestAnimationFrame(this.animateLogoDirectional.bind(this, direction))
    }

    previousFrame = undefined
    animationDuration = 5000
    animateToX = undefined
    animateToY = undefined
    animationSpeed = 10

    animateLogoDirectional(direction, timestamp) {
      let delta = this.previousFrame === undefined ? delta = 16 : timestamp - this.previousFrame
      
      if (this.animateToX === undefined && this.animateToY === undefined) return
      
      if (direction === 'left') delta *= -1
      
      if ((direction == 'left' && this.logo.x > this.animateToX) ||
          (direction == 'right' && this.logo.x < this.animateToX))
        this.logo.x = this.logo.x + (delta / this.animationDuration) * 300
      
      this.logo.y = 150 + Math.sin(timestamp / 500) * 10
      this.logo.style.transform = 'rotate('+timestamp % 360 + 'deg)'

      if ((direction == 'left' && this.logo.x <= this.animateToX) || 
          (direction == 'right' && this.logo.x >= this.animateToX)) {
        this.previousFrame = undefined
        return
      } 
      
      this.previousFrame = timestamp
      
      requestAnimationFrame(this.animateLogoDirectional.bind(this, direction))
    }

    switchBackToDefault() {
      this.screens.splice(this.screens.indexOf(this.default), 1)
      this.screens.unshift(this.default)
      DayMaker.switchTo('default')
    }
}

// Create and start the application.
DayMaker.start();


let updateReceived = false;

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

//interval for alarm polling
let alarmTimeoutId = undefined;
let alarmInterval = function() {
  let ui = DayMaker.instance.default;
  if ((updateReceived || ui.obtainedSettings) && ui.alarm.alarmShouldBuzz()) {
    clock.granularity = "seconds"
    ui.alarm.buzz()
    console.log(`buzzing, steps to go: ${ui.alarm.stepsToGo()}`)
  }
  
  ui.showOrHideWakeupImage()

  console.log(`interval time: ${ui.alarm.getTimeoutIntervalDuration() / 1000 / 60} minutes`)
  alarmTimeoutId = setTimeout(alarmInterval, ui.alarm.getTimeoutIntervalDuration())
}

alarmInterval();

// Listen for the onmessage event
//update and save settings received
messaging.peerSocket.onmessage = function({data}) {
  let ui = DayMaker.instance.default;

  if (ui.alarm.showBatteryLevel != data.showBatteryLevel) {
    ui.alarm.showBatteryLevel = data.showBatteryLevel
    DayMaker.instance.handlePowerLevel()
  }
  
  ui.alarm.saveAlarmData(data)
  
  ui.showOrHideWakeupImage()

  updateReceived = true
  
  if (alarmTimeoutId !== undefined) clearTimeout(alarmTimeoutId)
  alarmInterval()
  
  console.log('updated')
}

// Update the clock every second / minute
clock.granularity = "seconds";//"minutes";
let clockGranularityUpdateId = null

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date

  DayMaker.instance.screen.updateReceived = updateReceived
  DayMaker.instance.screen.today = today
  DayMaker.instance.render()
  
  //if we're getting this update, it means we're rendering the clock, so we should switch it to second
  // updates, and then in 1 minute switch back to minutes, unless we render again, then reset that timer
  clock.granularity = "seconds"
  if (clockGranularityUpdateId) clearTimeout(clockGranularityUpdateId)
  clockGranularityUpdateId = setTimeout(() => clock.granularity = "minutes", 60 * 1000)
}

import { inbox } from "file-transfer"

// Event occurs when new file(s) are received
inbox.onnewfile = function (e) {
  var fileName;
  do {
    // If there is a file, move it from staging into the application folder
    fileName = inbox.nextFile();
    if (fileName) {
      
      DayMaker.instance.default.showOrHideWakeupImage()
      console.log("/private/data/" + fileName + " is now available");
      fileName = inbox.nextFile();
    }
  } while (fileName);
};