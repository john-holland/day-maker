//import document from "document"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { $, $at } from '../../common/view'
import { StepGoalEstimation } from '../../common/stepgoalestimation'
import { UserInterface } from '../ui'

let document = require("document");

const $ = $at('#steps');

class StepPerHourTimer {
  stepsThisHour = 0
  dayStarted = -1
  started = false
  stepPerHourStartTimeoutId = undefined
  stepPerHourIntervalId = undefined
  
  start() {
    if (this.stepPerHourStartTimeoutId || this.stepPerHourIntervalId) {
      return
    }
    
    this.started = true
    let date = (new Date())
    let minutes = date.getMinutes()
    let seconds = date.getSeconds()
    this.dayStarted = date.getDay()
    
    if (minutes === 0) {
      this.startInterval()
    } else {
      this.stepPerHourStartTimeoutId = setTimeout(this.startInterval.bind(this), (60 - minutes) * 1000 * 60 - seconds * 1000)
    }
  }
  
  startInterval() {
    this.started = true
    const ONE_HOUR = 60 * 60 * 1000
    this.lastKnownSteps = todayActivity.local.steps
    console.log('started step per hour interval')
    this.stepPerHourIntervalId = setInterval(function() {
      this.lastKnownSteps = todayActivity.local.steps
      console.log('step per hour interval')
      
      if ((new Date()).getDay() != this.dayStarted) {
        this.reset()
      }
    }.bind(this), ONE_HOUR)
  }

  stepsSinceStartOfHour() {
    if (this.stepPerHourIntervalId !== undefined) return todayActivity.local.steps - this.lastKnownSteps
    else return undefined
  }

  reset() {
    this.started = false
    this.dayStarted = -1
    this.stepsThisHour = 0
    clearInterval(this.stepPerHourIntervalId)
    clearTimeout(this.stepPerHourStartTimeoutId)
    this.stepPerHourStartTimeoutId = undefined
    this.stepPerHourIntervalId = undefined
  }
}

export class StepsUI extends UserInterface {
  name = 'steps'
  stepPerHourTimer = null
  stepGoalEstimation = new StepGoalEstimation()

  constructor() {
    super()
    this.$ = $
    this.el = this.$()
    goals.addEventListener("reachgoal", (goal, evt) => {
      if (goal === 'steps' && !this.stepPerHourTimer) {
        this.stepPerHourTimer = new StepPerHourTimer()
        this.stepPerHourTimer.start()
      }
    })
  }

	onRender() {
    super.onRender()
    this.$("#time").text = `${todayActivity.local.steps || 0} steps`
    
    let stepsToGo = this.stepGoalEstimation.getStepsToGo()
    
    let message = 'Goal! Way to go!'
    if (stepsToGo > 0) {
      message = this.stepGoalEstimation.getEstimation()
    } else if (this.stepPerHourTimer && this.stepPerHourTimer.stepsSinceStartOfHour() !== undefined) {
      message = `${this.stepPerHourTimer.stepsSinceStartOfHour()} steps this hour`
    }
    
    this.$("#goalMinutes").text = message
    this.$("#goalMinutes").style.fill = this.$("#message").style.fill
	}
}
