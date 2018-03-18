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
import { StepsUI } from './steps'
import { CaloriesUI } from './calories' 
import { FloorsUI } from './floors'
import { ActiveMinutesUI } from './activeminutes'
import { BatteryLevelUI } from './batterylevel'

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
        console.log('show power')
      } else if (!this.default.alarm.showBatteryLevel && this.screens.indexOf(this.batterylevel) > -1) {
        this.screens.splice(this.screens.indexOf(this.batterylevel), 1)
        console.log('hide power')
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

// Update the clock every minute
clock.granularity = "seconds";//"minutes";
let alarmTimeoutId = undefined;
let alarmInterval = function() {
  let ui = DayMaker.instance.default;
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
//update and save settings received
messaging.peerSocket.onmessage = function({data}) {
  let ui = DayMaker.instance.default;

  if (ui.alarm.showBatteryLevel != data.showBatteryLevel) {
    ui.alarm.showBatteryLevel = data.showBatteryLevel
    DayMaker.instance.handlePowerLevel()
  }
  
  ui.alarm.saveAlarmData(data)

  updateReceived = true
  
  if (alarmTimeoutId !== undefined) clearTimeout(alarmTimeoutId)
  alarmInterval()
  
  console.log('updated')
}

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date

  DayMaker.instance.screen.updateReceived = updateReceived
  DayMaker.instance.screen.today = today
  DayMaker.instance.render()
}