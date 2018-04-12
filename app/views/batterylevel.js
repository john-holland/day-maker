//import document from "document"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { battery, charger } from "power";

let document = require("document");

const $ = $at('#batterylevel');

let batteryEstimate = {
  charge: undefined,
  time: undefined
}

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

export class BatteryLevelUI extends UserInterface {
  name = 'batterylevel'

  constructor() {
    super()
    this.$ = $
    this.el = this.$()
  }

	onRender() {
    super.onRender()
    this.$("#time").text = `${battery.chargeLevel || 0}% power`
    const SECONDS_FOR_ESTIMATE = 30
    const SECONDS_FOR_AVG_BUFFER_RESET = 60 * 60
    let currentTimeSeconds = (new Date()).getTime() / 1000
    let chargeLevel = battery.chargeLevel
    const HOURS = 24 * 4
      
    let estimate = createEstimateMessage(HOURS * (chargeLevel / 100))
    if (batteryEstimate.charge === undefined || batteryEstimate.charge < chargeLevel || charger.connected) {
      //if we don't yet have a suitable charge / time
      //if we charged since the last time we checked or we're currently charging, reset the estimate
      batteryEstimate.charge = chargeLevel
      batteryEstimate.time = currentTimeSeconds
      durationPerPercentChargeData = []
    } else if (batteryEstimate.charge > chargeLevel) {
      let diffSeconds = currentTimeSeconds - batteryEstimate.time
      if (diffSeconds > SECONDS_FOR_ESTIMATE) {
        //we don't want to use the rolling average if it's been more than an hour(?)
        if (diffSeconds > SECONDS_FOR_AVG_BUFFER_RESET) {
          durationPerPercentChargeData = []
        }
        
        //then the estimate will be the change in charge / diffSeconds
        let batterydiff = batteryEstimate.charge - chargeLevel
        
        let durationPerPercentCharge = diffSeconds / batterydiff
        durationPerPercentChargeData.push(durationPerPercentCharge)
        
        console.log(JSON.stringify(durationPerPercentChargeData))
        
        let estimateSeconds = average(durationPerPercentChargeData, 5) * chargeLevel
        
        estimate = createEstimateMessage(estimateSeconds / 60 / 60)
      }      
    }
    
    this.$("#batteryestimate").text = estimate
    this.$("#batteryestimate").style.fill = this.$("#message").style.fill
	}
}
