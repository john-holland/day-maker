//import document from "document"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { battery, charger } from "power";

let document = require("document");

const $ = $at('#batterylevel');

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
	}
}
