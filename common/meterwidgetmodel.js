export class MeterWidgetModel {
  this.started = undefined
  
  constructor(widget, interval) {
    this.widget = widget
    this.interval = interval
  }
   
  start() {
    this.started = new Date().getTime()
    this.meterWidget.show()
  }
  
  stop() {
    this.started = undefined
    this.meterWidget.hide()
  }

  update() {
    if (this.started === undefined) {
      return
    }
    this.widget.setValue(this.getLiveElapsedTimeSeconds(), this.interval)
  }
  
  getElapsedTimeFromBuzzSeconds() {
    if (this.started === undefined) {
      return 0
    }
    return (new Date().getTime() - this.started) / (this.interval * 1000)
  }

  getLiveElapsedTimeSeconds() {
    if (this.started === undefined) {
      return 0
    }
    return (new Date().getTime() - this.started) % (this.interval * 1000)
  }
}