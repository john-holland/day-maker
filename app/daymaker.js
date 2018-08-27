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
import { TrainingUI } from './views/training'
import { SettingsUI } from './views/settings'

export class DayMaker extends Application {
    default = new UserInterface()
    steps = new StepsUI()
    calories = new CaloriesUI()
    floors = new FloorsUI()
    activeminutes = new ActiveMinutesUI()
    batterylevel = new BatteryLevelUI()
    timeoutId = null
    screenIndex = 0
    meterWidget = null
    settings = null
    training = null
    
    // Called once on application's start...
    onMount(){
        // Set initial screen.
        // Same as Application.switchTo( 'screen1' ), which might be used to switch screen from anywhere.
        //note that one consequence of accessor usage is that if you need access to this.screen during the render
        // call it won't be the currently set value, so use screens[0] instead
        this.screens = [this.default, this.steps, this.calories, this.floors, this.activeminutes]
        this.screen = this.default
        this.screenIndex = 0
      
        this.meterWidget = new MeterWidget(document.getElementById("training-meter"), { goalValue: 5 })
        this.meterWidget.hide()
        this.meterWidgetModel = new MeterWidgetModel(this.meterWidget, 5)
        this.settings = new SettingsUI(this)
        this.training = new TrainingUI(this)
        document.getElementById("settings-btn").onclick => this.switchTo('settings')
      
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
      this.meterWidgetModel.update()

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