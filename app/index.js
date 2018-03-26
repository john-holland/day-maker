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
goal: this watchface should help you go about your day

investigate: see if there's any lightweight ml for identifying common areas
  -> see if we could use this to let us do interesting / helpful things like:
    "hey you've been on the computer for 2 hours, think about taking a break!" if we can detect keyboard accelerometer
    might need a training mode? could be better just to detect lack of steps
    Could also be good to detect a similar motion, and just say something along the lines of,
      "hey you've been at this for a whlle, maybe take a break?"
    could we identify when they're going out the door?
      - we could do a "hey dont forget your lunch etc" type thing
      - even without ml meal time reminders might help some people
      
  -> identifying the days / times wearer usually takes walks?
      
  monitor battery life, see about improvements / profiling

ideas:
  move the DayMaker class into another file
  get a running average battery life & display it on the battery screen?
  on the steps screen, introduce a "x minute walk to reach step goal" based on average pace
  think about what activity.onreachgoal might be good for 
  reminders for drinking water / custom movement reminders with a 'dont ask again until x' might be neat
  think about implementing a unified timeline to allow for multiple alarms, events, calendar syncing etc
    -> a separate website for that might be a good idea
  think about fitness / health oriented features
  calendar integration (i think this is upcoming as a platform feature...)
  in addition to sunrise, lunch time, and sunset images would be cool as options
    -> have option to display at the appropriate times of the day?
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
    screenIndex = 0
    
    // Called once on application's start...
    onMount(){
        // Set initial screen.
        // Same as Application.switchTo( 'screen1' ), which might be used to switch screen from anywhere.
        //note that one consequence of accessor usage is that if you need access to this.screen during the render
        // call it won't be the currently set value, so use screens[0] instead
        this.screens = [this.default, this.steps, this.calories, this.floors, this.activeminutes]
        this.screen = this.default
        this.screenIndex = 0
      
        this.handlePowerLevel()
          
        document.getElementById("boundingbox").onmouseup = this.onmouseup.bind(this)
    }

    handlePowerLevel() {
      if (this.default.alarm.showBatteryLevel && this.screens.indexOf(this.batterylevel) === -1) {
        this.screens.push(this.batterylevel)
      } else if (!this.default.alarm.showBatteryLevel && this.screens.indexOf(this.batterylevel) > -1) {
        this.screens.splice(this.screens.indexOf(this.batterylevel), 1)
      }
    }

    // Event handler, must be pinned down to the class to preserve `this`.
    onmouseup({ key }) {
      this.screenIndex = (this.screenIndex + 1) % this.screens.length
      Application.switchTo(this.screens[this.screenIndex].name)
      console.log('switching: ' + this.screens[this.screenIndex].name)
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
      DayMaker.switchTo('default')
      this.screenIndex = 0
    }

    onStart() {
      //we just want to iterate through a list,
      // and set a timeout to call the next item
      // on the completion of the current timeout
      let sequence = (list, foreach) => {
        list.forEach((item, i) => {
          setTimeout(() => {
            foreach(item);
          }, 1000 * i+1)
        })
      }
      
      sequence(this.screens, screen => this.screen = screen)
      setTimeout(() => this.screen = this.default, (this.screens.length+1) * 1000)
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