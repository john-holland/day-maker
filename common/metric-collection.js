import { today, goals } from "user-activity"
import { battery, charger } from "power"
import { HeartRateSensor } from "heart-rate"
import { Barometer } from "barometer"
import { Gyroscope } from "gyroscope"

/**
  
  one option is to save a separate file for each metric time span
   -> steps_5minutes_1537935402544
   -> metric_timespan_timestamp
   
  this would allow us to unload those after collection, and load only what we need at runtime

 */

class MetricHistogramScheduler {
    histograms = []
    intervalIds = {}
    available = []

    start(histogram) {
        if (!histograms.any(h => h.collectionInterval === histogram.collectionInterval)) {
            intervalIds[histogram.collectionInterval] = setInterval(() => this.histograms.forEach(h => h.collect()), histogram.collectionInterval)
        }

        histograms.push(histogram)
    }

    startAll() {
        this.available.forEach(a => a.start())
    }

    stop(histogram) {
        let index = histograms.indexOf(histogram)

        if (index > -1) {
            histograms.splice(index, 1)
        }

        //if we don't have any more histograms that have the same interval, then clear the interval if it's in the intervalIds
        if (histograms.filter(h => h.collectionInterval == histogram.collectionInterval) == 0 && histograms.collectionInterval in intervalIds) {
            clearInterval(intervalIds[histogram.collectionInterval])
        }
    }

    stopAll() {
        this.available.forEach(a => a.stop())
    }
}

export let scheduler = new MetricHistogramScheduler()
let noop = function() {}
export class MetricHistogram {
    on = false
    collection = []

    constructor(name, collectionInterval, accessor, init = noop, teardown = noop, maxStorage = -1) {
        this.name = name
        this.accessor = accessor
        this.collectionInterval = collectionInterval
        this.init = init
        this.teardown = teardown
        this.maxStorage = maxStorage
    }

    collect() {
        this.addValue(this.accessor())

        if (this.maxStorage > -1 && this.collection.length > this.maxStorage) {
            this.collection.shift()
        }
    }
    
    addValue(value) {
        this.collection.push({ timestamp: new Date().getTime(), value: value })
    }

    start() {
        this.stop()
        this.init()
        scheduler.start(this)
    }

    stop() {
        this.teardown()
        scheduler.stop(this)
    }

    getWithinFifteen(date) {
      const FIFTEEN_MINUTES_MIILLESONDS = 15 * 60 * 1000
      
      let fifteenBefore = date - FIFTEEN_MINUTES_MIILLESONDS
      let fifteenAfter = date + FIFTEEN_MINUTES_MIILLESONDS
      return this.collection.filter(d => d.timestamp >= fifteenBefore && d.timestamp <= fifteenAfter).map(d => d.value)
    }

    /**
        returns the metric collection histogram within the specified duration.
        for note, the duration is on either side of the date

        @return metric histogram
     */
    getWithinDuration(date, duration) {
      const FIFTEEN_MINUTES_MIILLESONDS = 15 * 60 * 1000
      
      let fifteenBefore = date - duration
      let fifteenAfter = date + duration
      return this.collection.filter(d => d.timestamp >= fifteenBefore && d.timestamp <= fifteenAfter).map(d => d.value)
    }
}


gyro.start()
bar.start()
hrm.start()

const ONE_MINUTE = 60 * 1000
const FIVE_MINUTES = 5 * ONE_MINUTE
const TEN_MINUTES = 10 * ONE_MINUTE

let heartRateMonitor = new HeartRateSensor()
let gyro = new Gyroscope({ frequency: 10 })
let bar = new Barometer()

export let accelerometer = new MetricHistogram('accelerometer', ONE_SECOND, () => { return [gyro.x.toFixed(3), gyro.y.toFixed(3), gyro.z.toFixed(3)] }, () => gyro.start(), () => gyro.stop())
export let barometer = new MetricHistogram('barometer', ONE_SECOND, () => bar.pressure ? parseInt(bar.pressure) : 0, () => bar.start(), () => bar.stop())
export let steps = new MetricHistogram('steps', ONE_MINUTE, () => todayActivity.local.steps || 0)
export let elevation = new MetricHistogram('elevationGain', ONE_MINUTE, () => today.local.elevationGain || 0)
export let hr = new MetricHistogram('hr', ONE_MINUTE, () => heartRateMonitor.heartRate || '--', () => heartRateMonitor.start(), () => heartRateMonitor.stop()) //might have to reinit?
export let power = new MetricHistogram('power', FIVE_MINUTES, () => battery.chargeLevel)
export let incharger = new MetricHistogram('incharger', TEN_MINUTES, () => charger.connected ? 1 : 0)
export let calories = new MetricHistogram('calories', FIVE_MINUTES, () => today.local.calories)

scheduler.available.concat([steps, elevation, heartRateMonitor, hr, power, incharger, calories, accelerometer, barometer])
