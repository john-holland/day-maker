import document from "document";
import { _ } from '../../common/lfn'
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { vibration } from "haptics"
import { PeerMessageQueue } from "../../common/peermessagequeue"

let messagequeue = new PeerMessageQueue()
let $ = $at('settings')

export class SettingsUI extends UserInterface {
  name = 'settings'
  settings = document.getElementById("settings-list")

  constructor(daymaker) {
    this.daymaker = daymaker
    this.$ = $
    this.el = this.$()
    
    this.buttonlist('#settings-list .items', ['training', 'toggle alarm', 'go back'], setting => {
      if (setting == 'training') {
        this.daymaker.trainingUI.starttraining()
      } else if (setting == 'toggle alarm') {
        this.daymaker.alarm.alarmEnabled = !this.daymaker.alarm.alarmEnabled
        this.daymaker.alarm.disableAlarm = !this.daymaker.alarm.disableAlarm
        messagequeue.sendMessage({
          name: "settings",
          data: {
            alarmEnabled: this.daymaker.alarm.alarmEnabled,
            disableAlarm: this.daymaker.alarm.disableAlarm            
          }
        })
      } else {
        this.daymaker.switchBackToDefault()
      }
    })
  }

  buttonlist(listselector, events, callback) {
    vibration.start('nudge-max')
    
    //ok this uses static list assets, 
    let items = this.$(listselector)
    
    items.forEach(function(element, index) {
      if (index > items.length - 1) {
        element.display = 'none'
      } else {
        element.display = 'inline'
      }
      
      let touch = element.getElementById("touch-me")
      let name = element.getElementById("text")
      let event = events[index]
      name.text = event

      touch.onclick = () => callback(event)
    }.bind(this))
  }
}