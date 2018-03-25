//import document from "document"
import { Alarm } from "../common/alarm"
import * as util from "../common/utils"
import { today as todayActivity, goals } from "user-activity"
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'

let document = require("document");

const $ = $at('#calories');

export class CaloriesUI extends UserInterface {
  name = 'calories'

  constructor() {
    super()
    this.$ = $
    this.el = this.$()
  }

	onRender() {
    super.onRender()
    this.$("#time").text = `${todayActivity.local.calories || 0} cals`
	}
}
