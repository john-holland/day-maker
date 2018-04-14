//import document from "document"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { battery, charger } from "power";

let document = require("document");

const $ = $at('#batterylevel');

//for calc of moving average
let durationPerPercentChargeData = []

function createEstimateMessage(hours) {
  let days = Math.floor(hours / 24)
  let flrHours = Math.floor(hours - days * 24)
  let minutes = Math.floor((hours - Math.floor(hours)) * 60)
  minutes = minutes < 10 ? '0' + minutes : minutes

  if (days === 0) {
    return `${flrHours}:${minutes} estimated battery`//based off 4 day battery life avg
  } else {
    return `${days} days, ${flrHours}:${minutes} estimated battery`//based off 4 day battery life avg 
  }
}

/**
 * averages the numbers array and limit size to maxlen
 *  we use this as a rolling average by pushing new data onto the back and dequing
 */
function average(numbers, maxlen) {
  while (numbers.length > maxlen) {
    numbers.shift()
  }
  
  let sum = 0
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i]
  }
  
  return sum / numbers.length
}
const SECONDS_FOR_AVG_BUFFER_RESET = 60 * 60
const ESTIMATE_INTERVAL = 30000
const DATA_BUFFER_SIZE = 60 //last half hour
const DATA_BUFFER_ESTIMATE_MINIMUM = 10 //5 minutes of readings

class BatteryEstimator {
  data = []
  estimateIntervalId = undefined
  batteryEstimate = {
    charge: undefined,
    time: undefined
  }

  currentTimeInSeconds() {
    return (new Date()).getTime() / 1000
  }

  reset() {
    this.stop()
    this.start()
  }

  start() {
    this.batteryEstimate.charge = battery.charge
    this.batteryEstimate.time = this.currentTimeInSeconds()
    
    this.estimateIntervalId = setInterval(function() {
      let currentTimeInSeconds = this.currentTimeInSeconds()
      let diffSeconds = currentTimeInSeconds - this.batteryEstimate.time
      
      //it should reset if they charge anyways, but just in case
      if (diffSeconds > SECONDS_FOR_AVG_BUFFER_RESET || this.shouldReset()) {
        this.reset()
        return
      }

      //then the estimate will be the change in charge / diffSeconds
      let batterydiff = this.batteryEstimate.charge - battery.charge

      let durationPerPercentCharge = diffSeconds / batterydiff
      this.data.push(durationPerPercentCharge)

      this.batteryEstimate.time = currentTimeInSeconds
      this.batteryEstimate.charge = battery.charge
    }.bind(this), ESTIMATE_INTERVAL)
  }

  isEstimateAvailable() {
    return this.batteryEstimate.charge >= battery.charge && this.data.length >= DATA_BUFFER_ESTIMATE_MINIMUM
  }

  getEstimate() {
    return average(this.data, DATA_BUFFER_SIZE) * battery.charge
  }

  shouldReset() {
    return this.batteryEstimate.charge < battery.charge || charger.connected
  }

  stop() {
    this.data = []
    clearInterval(this.estimateIntervalId)
    this.estimateIntervalId = undefined
    this.batteryEstimate.charge = undefined
    this.batteryEstimate.time = undefinedc
  }
}

export class BatteryLevelUI extends UserInterface {
  name = 'batterylevel'
  batteryEstimator = new BatteryEstimator()

  constructor() {
    super()
    this.$ = $
    this.el = this.$()
    this.batteryEstimator.start()
  }

	onRender() {
    super.onRender()
    this.$("#time").text = `${battery.chargeLevel || 0}% power`
    const SECONDS_FOR_ESTIMATE = 30
    
    let chargeLevel = battery.chargeLevel
    const HOURS = 24 * 4
      
    let estimate = createEstimateMessage(HOURS * (chargeLevel / 100))
    if (this.batteryEstimator.shouldReset()) {
      //if we don't yet have a suitable charge / time
      //if we charged since the last time we checked or we're currently charging, reset the estimate
      this.batteryEstimator.reset()
    } else if (this.batteryEstimator.isEstimateAvailable()) {
      estimate = createEstimateMessage(estimateSeconds / 60 / 60)
    }
    
    this.$("#batteryestimate").text = estimate
    this.$("#batteryestimate").style.fill = this.$("#message").style.fill
	}
}
