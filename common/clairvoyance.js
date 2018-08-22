import { today } from "user-activity"
import { KalmanFilter } from "./fitness-functions/kalman-filter"
import { scheduler, steps, elevation, heartRateMonitor, hr, power, incharger, calories, accelerometer, barometer, MetricHistogram } from "./metric-collection"
import { _ } from './underscore'
import { _knn } from './fitness-functions/_knn'
import { chiSquaredFitness } from './fitness-functions/chi-squared-test'
import { euclideanDistance } from './fitness-functions/euclidean-distance'

export class Clairvoyance {
  constructor() {

  }

  startMetricCollection() {
    _.uniq(_.flatten(
      _.pairs(EventProvider.instance.events)
        .map(e => e[1].collectForFitness())))
        .forEach(metric => METRICS[metric].start())
  }

  stopMetricCollection() {
    _.uniq(_.flatten(
      _.pairs(EventProvider.instance.events)
        .map(e => e[1].collectForFitness())))
        .forEach(metric => METRICS[metric].stop())
  }

  getPredictions(date, dataEvalCount = -1) {
    // save the data that is selected by the user,
    //  if no selection is made then save top N data
    return EventProvider.instance.getSortedByFitness(date, dataEvalCount)
  }

  /**
    retrieves the likely events from the current data, sorted by fitness desc

    @param top: the number of events to return
    @param dataEvalCount: how many previously collected data set to evaluate
    @param date: the date
   */
  getLikelyEvents(top = 1, date = new Date().getTime(), dataEvalCount = -1) {
    return _.first(this.getPredictions(date, dataEvalCount), top)
  }

  selectionMade(event) {
    let e = EventProvider.instance.events[event]

    e.data.push(e.collectForFitness().reduce((acc, metric) => {
      acc[metric] = METRICS[metric].getWithinDuration(e.duration)
      return acc
    }, { })
    e.save()
  }
  
  initialize() {
    this.loadEvents()
  }

  loadEvents() {
    _.pairs(EventProvider.instance.events).forEach(p => p[1].load())
  }
  
  saveEvents() {
    _.pairs(EventProvider.instance.events).forEach(p => p[1].save())
  }

  //metrics, time, 
}

const EVENT_DESCRIPTION_FILENAME = "stepevent.flat"
const FIVE_MINUTES_MILLISECONDS = 60 * 5 * 1000

let METRICS = {
  steps: steps,
  elevation: elevation,
  hr: hr,
  power: power,
  incharger: incharger,
  calories: calories,
  acc: accelerometer,
  bar: barometer
}

/**
  index, timestamp, count, fiveminutes, tenminutes, fifteenminutes
  
  ok
  
  the events should store data that they need for their fitness functions?
  maybe also they should store 
*/
class EventDescription {
  constructor(name, duration, ...fitness) {
    this.name = name
    this.duration = duration
    this.data = []
    this.fitness = [...fitness] //redundant destructuring?
    this.training = {} //training set of data collected from fitness functions, used for comparison
    
    this.assembleFitness(this.fitness)
  }

  getMetric(name, training) {
    let data = METRICS[name].getWithinDuration(date, this.duration)
    if (typeof name == 'string') {
      return (date, accfitness) => FITNESS_FUNCTIONS['standarddev'](data, accfitness, this.training[name])
    } else if (typeof name == 'object' && length in name && name.length >= 2) { //lazy array check
      if (name[1] == 'event') {
        return (date, accfitness) => EventProvider.instance.events[name[0]].getFitness(data, accfitness, this.training[name[0]])
      }

      let [metric, fitnessfn, ...restfns] = name
      
      if (restfns.length === 0) {
        return (date, accfitness) => this.getMetric(metric)(data, accfitness, this.training[name])
      } else {
        //if the builder is not an event
        // call name[1..n] recursively, left to right
        return (date, accfitness) => {
          //newData will be the same unless modified by a fitness function
          let [newData, newFitness] = this.getMetric(metric)(data, accfitness, this.training[name])
          return this.getMetric([metric, ...restfns])(newData, newFitness, this.training[name])
        }
      }
    }

    console.error('boop boop, getMetric is broken with parameter name=' + name)
    return (date, accfitness) => [[], accfitness, []]
  }

  getFitness(date, accfitness, dataEvalCount = -1) {
    let datas = [this.training, ...(dataEvalCount < 0 ? this.data : _.first(this.data, dataEvalCount))]

    //if we end up normalizing the fitness value returned by getFitness,
    //  then we should also just stop when we have a complete fitness value
    //  e.x. if _.sum(fitnesses) == 1 then break
    return _.first(_.sortby(datas.map(td => {
      let fitnesses = this.fitness.map(fn => this.getMetric(fn, td)(date, acc))
      return _.sum(fitnesses, fns => fns[1])
    }), d => d))
  }

  //idealy this should be toggle-able
  // it would also be a good idea for each positive confirmation of "coffee?" -> "yes" to call this method
  // manual training would also be a good idea
  train(date) {
    this.training = this.collectForFitness()
  }

  collectForFitness() {
    //ideally we'ed cache these results based on fitness function key hash
    /*
      store training data obtained via the "train" method
      store any results satisfying a fitness function compared to standard deviation
      so like:
        getFitness([ A... ]) = 0.5, 0.3, 0.2, 0.1
        
        .275 mean avg
        .275 +/- 0.1479019945774904
        
        maybe toss any under 2x standard deviation ?
    */

    let metrics = _.uniq(_.flatten(
      this.fitness.map(fn => {
        if (typeof fn === 'string') { return fn }
        if (fn[1] === 'event') {
          return EventProvider.instance.events[fn[0]].collectForFitness()
        }

        return fn[0]
      })))

    let date = new Date().getTime()
    return metrics.map(ft => METRICS[ft].getWithinDuration(date, this.duration))
  }

  load() {
    //load from file
    try {
      let data = JSON.parse(readFileSync(this.name + EVENT_DESCRIPTION_FILENAME, "utf-8"))

      this.training = data.training
      this.data = data.data
    } catch (e) {
      console.error("could not load event file " + this.name, e)
    }
  }

  save() {
    //save
    try {
      writeFileSync(this.name + EVENT_DESCRIPTION_FILENAME, "utf-8", JSON.stringify({ training: this.training, data: this.data }))
    } catch (e) {
      console.error("could not save event file " + this.name, e) 
    }
  }
  
  getWithinFifteen(date) {
    return this.data.filter(d => Math.abs(date - d.timestamp) <= FIFTEEN_MINUTES_MILLISECONDS)
  }
}

let kalmanFilter = function(data) {
  let kalmanFilter = new KalmanFilter({R: 0.01, Q: 20})

  return data.map(v => kalmanFilter.filter(v))
}

let _normalize = function(data) {
  let zero = new Array(len).fill(0)
  let lengths = euclideanDistance(d, zero)
  let max = _.max(lengths)
  if (max == 0) { max = 1 }
  
  return lengths.map(l => l / max)
}

// support vector machine with polynomial kernal
// or possibly tree regression algorithms for fitness functions?
// have a look at http://staff.itee.uq.edu.au/lovell/aprs/dicta2003/pdf/0693.pdf
// also take a look at, some good answers https://www.researchgate.net/post/How_to_assess_goodness_of_fit_for_a_non-linear_model
// heh https://www.mathsisfun.com/data/standard-deviation.html
// https://www.wouterbulten.nl/blog/tech/lightweight-javascript-library-for-noise-filtering/
// http://staff.itee.uq.edu.au/lovell/aprs/dicta2003/pdf/0693.pdf
// http://journals.plos.org/plosone/article?id=10.1371/journal.pone.0184216
// did not end up using it but a good simple knn explanation http://16cards.com/2013/06/06/knn-in-parse-cloud/

const FITNESS_FUNCTIONS = {
  //closest to the mean = 1
  'standarddev': (data, fitness, training) => [data, 1 - Math.abs(average(training) - average(data)) / standardDeviation(data) + fitness],
  'swaying': (data, fitness, training) => [data, chiSquaredFitness(normalize(data), normalize(training))],
  'kalmanfilter': (data, fitness, training) => [kalmanFilter(data), fitness],
  'knn': (data, fitness, training) => [data, _knn(training, data)],
  'chisquared': (data, fitness, training) => [data, chiSquaredFitness(data, training)],
  'normalize': (data, fitness, training) => [_normalize(data), fitness],
  'jerky':  (data, fitness, training) => [data, _knn(normalize(training), normalize(data))]
}

function ftfn(fitnessfn) {
  return (args) => {
    let [metric, ...fitnessfns] = args
    return fitnessfns.length > 0 ? [metric, fitnessfns, fitnessfn] : [metric, fitnessfn]
  }
}

const swaying = ftfn("swaying")
const chisquared = ftfn("chisquared")
const knn = ftfn("knn")
const normalize = ftfn("normalize")
const kalmanfilter = ftfn("kalmanfilter")
const jerky = ftfn("jerky")
const event = ftfn("event")

const FIFTEEN_MINUTES_MILLISECONDS = 60 * 15 * 1000

const ONE_MINUTE = 60 * 1000
const FIVE_MINUTES = ONE_MINUTE * 5
const TEN_MINUTES = ONE_MINUTE * 10
const FIFTEEN_MINUTES = ONE_MINUTE * 15
const HALF_HOUR = ONE_MINUTE * 30

/**
  set up a scheduler, to make checkpoints
*/
class EventProvider {
  events = {}

  //movie with ar integration, where you need to download an app and you see different stuff compared to other people
  // you could also have messages or instructions to hold the phone up in front of the person behind you
  // you could have people register based on the day etc, and make it a "session", good for spy movies or action movies
  // the writing would have to be good enough to accomidate audience interaction
  //  i.e. it would give well to something with a super complicated plot (see: Primer), where the ending and results are certain, but the way they got that way
  //  is less than obvious, and could be figured out by app integration

  // you could also just do a bunch of hokay shit with disney movies etc, make so much money, so much
  // /premium movie features/ -> //!movie dlc!// -> sort of bleh but idk people would like it probably
  // plus the nice thing about dlc is you do not need to download it!
  // so weird!
  constructor() {
    
  }

  static _instance = new EventProvider()
  static get instance() {
      return EventProvider._instance
  }

  initializeEvents() {
    //if the arguments
    // EventDescriptor('name', ...'fitness function metric default to standard deviation' or { 'metric': 'fitness function, can recurse' })
    this.events.coffee = new EventDescriptor('coffee', TEN_MINUTES, knn('time'), knn(normalize('steps')), event('eating'))
    this.events.wakeup = new EventDescriptor('wakeup', FIFTEEN_MINUTES, knn('time'), 'steps', 'acc')
    this.events.gotosleep = new EventDescriptor('gotosleep', HALF_HOUR, knn('time'), 'steps', 'acc')
    this.events.onbus = new EventDescriptor('onbus', FIFTEEN_MINUTES, 'steps', knn('time'), chisquared(kalmanfilter('acc')))
      //linearregress_signwave -> maybe use kalman filter to remove constant bus jitter?
      // could maybe also make something to count 'stops'
      // could compare noiseness from kalman filter?
    this.events.drive = new EventDescriptor('drive', FIVE_MINUTES, 'steps', swaying(kalmanfilter('acc')))// { 'acc': { 'swaying': 'kalmanfilter' }}, { 'swaying': { 'kalmanfilter': 'acc' }})
    this.events.bike = new EventDescriptor('bike', TEN_MINUTES, 'steps', 'acc', 'hr')
    this.events.eating = new EventDescriptor('eating', TEN_MINUTES, 'steps', 'acc', 'bar', 'hr')
    this.events.breakfast = new EventDescriptor('breakfast', TEN_MINUTES, event('eating'))
    this.events.lunch = new EventDescriptor('lunch', TEN_MINUTES, 'time', event('eating')) //knearestneighbors_linear -> thinking mostly matching on curves, then knearest or something
    this.events.dinner = new EventDescriptor('dinner', TEN_MINUTES, 'time', event('eating'))
    this.events.sex = new EventDescriptor('sex', FIFTEEN_MINUTES, 'steps', 'hr', jerky('acc'))
    this.events.walking = new EventDescriptor('walking', TEN_MINUTES, 'steps', 'elevation', 'hr')
    this.events.running = new EventDescriptor('running', FIVE_MINUTES, 'steps', 'elevation', chisquared('hr'), 'hr')
    this.events.masterbation = new EventDescriptor('masterbation', TEN_MINUTES, 'steps', jerky('acc'), 'hr', 'bar')
    this.events.videogames = new EventDescriptor('videogames', HALF_HOUR, 'steps', 'acc', 'hr')
    this.events.writing = new EventDescriptor('writing', FIVE_MINUTES, jerky('acc'), 'steps')
    this.events.typing = new EventDescriptor('typing', FIVE_MINUTES, jerky('acc'), 'steps', 'bar')
  }

  getEvents(date) {
    //filter by 15 minute intervals so we can see what usually happens at a given time
    return data.filter(e => e.getWithinFifteen(date))
  }
   
  /**
    @return returns events sorted by their fitness score, in the form [eventname, fitness]    
   */
  getSortedByFitness(date, dataEvalCount) {
    return _.sortby(_.pairs(this.events).map(e => [e[0], e[1].getFitness(date, 1, dataEvalCount)]), e => e[1])
  }

  getEvents(name) {
    return data.filter(d => d.name)
  }
}

//from https://derickbailey.com/2014/09/21/calculating-standard-deviation-with-array-map-and-array-reduce-in-javascript/

function standardDeviation(values) {
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}