import document from "document";
import { _ } from '../../common/lfn'
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { vibration } from "haptics"

const $ = $at('#eventconfirmation');

const EVENT_COUNT = 5
export class EventConfirmationUI extends UserInterface {
  name = 'eventconfirmation'
  trainList = document.getElementById("trainList")
  statusText = document.getElementById("status")

  constructor(daymaker) {
    this.daymaker = daymaker
    this.clairvoyance = daymaker.clairvoyance
    this.$ = $
    this.el = this.$()
  }

  onRender() {
    super.onRender()
  }

  listEvents(events) {
    DayMaker.switchTo('eventconfirmation')
    vibration.start('nudge-max')
    //ok this uses static list assets, 
    let items = this.$("#event-list .item")
    
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

      touch.onclick = function(evt) {
        this.clairvoyance.selectionMade(event)
        this.switchBackToDefault()
      }.bind(this)
    }.bind(this))
    
    this.$("#event-list .no-match").onclick = function() {
      this.clairvoyance.selectionMade(undefined)
      this.switchBackToDefault()
    }

  }
}