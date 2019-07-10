import document from "document";
import { _ } from '../../common/lfn'
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { vibration } from "haptics"
import { PeerMessageQueue } from "../../common/peermessagequeue"

let messagequeue = new PeerMessageQueue()
let $ = $at('#settings')

export class SettingsUI extends UserInterface {
  name = 'settings'
  settings = document.getElementById("settings-list")

  constructor(daymaker) {
    this.daymaker = daymaker
    this.$ = $
    this.el = this.$()
  }

  onMount() {
    //this.el.style.display = 'inline';
    console.log('mount settings')
    this.buttonlist('#settings-list .item', ['training', 'toggle alarm', 'go back'], setting => {
      if (setting == 'training') {
        this.daymaker.training.starttraining()
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
	
  onRender() {
    super.onRender()
  }

  buttonlist(listselector, events, callback) {
    vibration.start('nudge-max')
    console.log('buttonlist selector: ' + listselector)
    
    //ok this uses static list assets, 
    let items = this.$(listselector)
    console.log('events ' + events.join(', '))
    console.log('items ' + items.map(i => i.text).join(', '))
    
    items.forEach(function(element, index) {
      if (index > events.length - 1) {
        console.log('hiding item: ' + index)
        element.style.display = 'none'
      } else {
        console.log('showing item: ' + events[index] + ' ' + index)
        element.style.display = 'inline'
        element.show()
      }
      
      let touch = element.getElementById("touch-me")
      let name = element.getElementById("text")
      let event = events[index]
      name.text = event

      touch.onclick = () => callback(event)
    }.bind(this))
  }
}