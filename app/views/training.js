import document from "document";
import { _ } from '../../common/lfn'
import { $, $at } from '../../common/view'
import { UserInterface } from '../ui'
import { vibration } from "haptics"

/*
make screen to perform manual training for each event type
   \ -> flow: "select event to train:" *select walking* -> "select: override, add or reset" *select add*
   \ ->       "select duration: 5, 10, 15" *selects 15* ->
   \ ->       *process starts -> *user walks for 15 minutes with training icon arc spinning (like blood donor)*
   \ ->       *at the end of 15 minutes, devices buzzes and training is complete, overriding default*
    \ -> make sure to give ability to reset to default
*/

let $ = $at('training')
export class TrainingUI extends UserInterface {
  name = 'training'
  statusText = document.getElementById("status")

  eventList = document.getElementById("eventlist")
  trainingAction = document.getElementById("trainingaction")
  trainingDuration = document.getElementById("trainingduration")

  event = undefined
  duration = undefined

  eventTrainingInProgressId = undefined

  constructor(daymaker) {
    this.daymaker = daymaker
    this.clairvoyance = daymaker.clairvoyance
    this.$ = $
    this.el = this.$()
  }

  starttraining() {
    this.eventList.style.display = "inline"
    this.trainingAction.style.display = "none"
    this.trainingDuration.style.display = "none"

    this.buttonlist("#eventlist .item", _.keys(this.clairvoyance.eventprovider.events).concat('go back'), event => {
      this.eventList.style.display = "none"
      this.trainingAction.style.display = "inline"
      this.buttonlist("#trainingaction .item", ['override', 'add', 'reset'], action => {
        let selectedAction = this.clairvoyance.eventprovider.instance.events[event]
        switch (action) {
          case 'override':
             this.eventtraining('reset', selectedAction)
             return
          case 'add':
             this.eventtraining('add', selectedAction)
             return
          case 'reset': 
             selectedAction.data = []
             selectedAction.save()
             this.daymaker.switchBackToDefault()
             return
        }
      })
    })
  }

  eventtraining(action, event) {
    this.trainingDuration.style.display = "none"
    this.buttonlist("#trainingduration .item", ["default for event", "1 minute", "2 minutes", "3 minutes", "5 minutes", "7 minutes", "10 minutes", "15 minutes", "20 minutes"], selectedduration => {
      let duration = selectedduration === "default for event" ? (e.duration / 1000 / 60) : Number(selectedduration.split(' ')[0])
      if (this.eventTrainingInProgressId !== undefined) {
        clearTimeout(this.eventTrainingInProgressId)
      }
      
      this.daymaker.switchBackToDefault()
      //enable the meter
      this.daymaker.meterWidgetModel.interval = duration * 60
      this.daymaker.meterWidgetModel.start()
      this.daymaker.meterWidget.show()
      
      this.eventTrainingInProgressId = setTimeout(() => {
        if (action === 'add') {
          this.clairvoyance.selectionMade(event.name, duration * 60 * 1000)
        } else if (action === 'override') {
          event.train(duration * 60 * 1000)
          event.save()
        }
        this.daymaker.meterWidgetModel.stop()
      }, duration * 60 * 1000)
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