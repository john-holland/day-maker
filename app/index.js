import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import * as util from "../common/utils";
import { Alarm } from "../common/alarm";
import * as messaging from "messaging";
import { DayMaker } from "./daymaker"

/**
goal: this watchface should help you go about your day

investigate: see if there's any lightweight ml for identifying common areas
- even without ml meal time reminders might help some people
  -> see if we could use this to let us do interesting / helpful things like:
    "hey you've been on the computer for 2 hours, think about taking a break!" if we can detect keyboard accelerometer
    might need a training mode? could be better just to detect lack of steps
    Could also be good to detect a similar motion, and just say something along the lines of,
      "hey you've been at this for a whlle, maybe take a break?"
    could we identify when they're going out the door?
      - we could do a "hey dont forget your lunch etc" type thing
      
  -> could it be as simple as detecting accelerometer data without step increase? 
      
  -> identifying the days / times wearer usually takes walks?
      
  monitor battery life, see about improvements / profiling
  -> look into mood log integration to ask "hey howre you doing?" etc

ideas:
  move the DayMaker class into another file
    -> show a "steps this hour" on the steps screen
  add "relax & breath" reminders for high stress times in the day
    -> could be a good use for light ML usage? Find least steps, high heart rate times
      - remind during those?
  add an optional sleep reminder
  make the "sunrise" picture customizable to any url, for people who want a picture of their kid or dog or something to wake up to
  think about what activity.onreachgoal might be good for 
  reminders for drinking water / custom movement reminders with a 'dont ask again until x' might be neat
  think about implementing a unified timeline to allow for multiple alarms, events, calendar syncing etc
    -> a separate website for that might be a good idea
  think about fitness / health oriented features
  in addition to sunrise, lunch time, and sunset images would be cool as options
    -> have option to display at the appropriate times of the day?
  look at other UI patterns that could be useful for the fitbit
    -> how could we benefit from a pattern like react / mithril but with an immutable DOM?
  weather features?
    -> pull on weather and say "go outside! it's nice!" when it's above 50, sunny, and the step goal isn't reached? or something
    -> when it's raining show tips after common meal times for NEAT exercise or something?
    
  keep track of the events each evaluation, and present a heatmap of the user's day
   \ -> this would show the user what they /probably/ would have been doing, vs what they did do
   | -> offer a "review day" feature, and allow users to verify events, etc
   
  on the website, make an "activity composer"
   \ -> lightweight UI for creating EventDescriptors(...)
   
   epic generator -> create multi person stories
    -> something like an anonymous mmo
    -> small party or town interactions, 
      "group similar lifestyles, provide prompts upon todo completion"
      allow leaving groups
    -> animal crossing sim?
      -> group people with similar lifestyles
      -> once a person is within coefficient of similarity, create house
      -> businesses created should allow for 
      
   dnd generator -> create campaign based loosely around the todo list
      -> predicted schedule as random encounters
      -> queue of encounters should present to user when they look, not intrusive
      -> separate app? website? settings page game lol?
      
      
   should look at thresholds for fitness functions, and develop some method for "minimum acceptable fitness"
    \ -> once I am confident in the confidence scores, we should not present "were you doing?" and instead just have a review function

  identify the profiles of healthy people and those who use the todo feature a lot, 
    and do a transform of the current user's profile to the healthy user's profile,
    number of suggestions should amount to a linear progression from current event 
    profile to the target profile
    
  create a speed profile for fitness-functions, and possibly a stream processor for more complicated fitness functions, if necessary
   \ -> avg together lots of thinly sliced data sets from a larger dataset for fitness values?

todo
  finish fixing settings list, and propegate those changes to event confirmation

  integrate sequencer with the fitness functions
    -> fitness func clairvoyance defs --> done!
    -> actual fitness functions... not done
    -> finish integrating promise based returns for getFitness etc
  figure out any lists to be replaced with int16array's
  change data loading for clairvoyance to lazy loading of data from disk, and unloading
  
  refactor clairvoyance classes into separate classes, then copy it to another application to test independently
  
  fix up training and settings - list do not display and some selectors not working
  
  refactor ui.js to create a base class for screens and one below that for modal ui's like settings
  
  currently the metric collection happens psudo randomly - there should be a good distrobution of times,
    weighted on what needs what and how best they coincide, also we could opt to collect those metrics
    at a more frequent interval

  optimization:
   -> switch to [int16arrays] or DataBuffer DataViews, or int16arrays
   MAYBE?! -> modify appropriate fitness functions to accept a DataStream from DataBuffer?
    \=> https://www.html5rocks.com/en/tutorials/webgl/typed_arrays/
    \-> and https://github.com/kig/DataStream.js/tree/master
    \-> just consume the array 2 at a time, for as many items as requested?
   YEAH! -> only load the data for EventDescriptors and DataHistograms when necessary?
   I GUESS! -> change the DataHistograms into log models -> fs.openSync(filename: string, flags: "a")
    YEAH IDK, APPEND IS AN OPTION BUT THEN IT GETS TOO BIG SO THAT'S AN ISSUE
    MAX SIZE AND READ ALL / OVERWITE SEEMS HEAVY HANDED? 
    \-> though it's unclear about how to write to it? maybe just use writeFileSync after opening?
   -> transfer of large back logs could be a problem 
    \-> solution?:  make metric histograms loop buffer / toroidal for data size limits
                    pull in reverse chronological order to prevent data thrash?
                     -> even though it seems backwards the nosql solution shouldn't care
  
  user aws lambda to interact with dynamo
   \ -> implement todo list page with 2factor auth
    |-> use the events to "auto complete" todo items
    |-> make accessible via the settings page in fitbit app
    \-> periodically dump logs from watch to server -> the predictor EventDescription logs
     | -> clean up those files
     \ -> use api requests from server to do more analysis / insights

  finish saving data for successful / selected events
   | -> store public id of the user in nosql but do not use for generic insights
   \ -> create polling event to copy over to companion and off to server
    | -> store last sent timestamp and just send training data with timestamps after that
    \ -> provide ack for last sent, then update alarm settings and save. (if local storage on the companion works I can omit the ack)
  
  allow for download of data / deletion of account related data (keep anonymized data in tables? legality smchargan?)
  
  add polling for 3rd party sources, to include in training optionally
   \ -> listening to music
   \ -> car?
   \ -> location, home, car, work, etc
   \ -> geofencing
   \ -> smart house?
   
  normalize fitness results for accurate guesses
  
  abstract settings out of the alarm class
  
  uh i think save may need data + training, currently just data idk  
  
  make sure to give ability to reset to default training once I have that data in there
  
  create similar events to the existing ones but only using time, and present "should you be running?"
   -> probably just need to use standard deviation and a couple others
  the onmouseup event might need to be tweaked
  write tests for predictor.js and metric-collection.js

done
  once training data is available, make screen to present user with options of "were you doing: A, B, or C?"
  make screen to perform manual training for each event type
     | -> flow: "select event to train:" *select walking* -> "select: override, add or reset" *select add*
     | ->       "select duration: 5, 10, 15" *selects 15* ->
     | ->       *process starts -> *user walks for 15 minutes with training icon arc spinning (like blood donor)*
     \ ->       *at the end of 15 minutes, devices buzzes and training is complete, overriding default*
  train and collect for fitness should take a "duration" or something to collect data ranges other than 15 minutes
  implement MetricHistogram for event selections
  finish implementing initial pass at kalman-filter using metric collection
   | -> work on the passthrough / fitness function return mechanism
    \ -> perhaps using tree regression on nested fitness functions would be good?
     \ -> i.e. behavior trees with fitness functions (it is effectively that, should explore more if helpful)
  take changes made to view.js and make them in forked branch 
  decided not to handle time format differently (given keyboard options)
  bedtime now supports plain hours or 24:00 format
  battery life estimates using rolling average or 4 day estimated time
  walk number of minutes to reach step goals based on 1.4 meters per second avg pace
  adjusted the sunrise image dimensions to the device resolution
  decided not to truncate hours in settings (7.5:30 is a weird time to allow) //if people really want to weird and ok
  implemented a reset for non-migrateable settings configurations
  
didn't
  NO! instead implement sequencer -> any fitness functions candidates for map reduce?
     - chi-squared-test for sure: main loop that calls calculateChiSquaredSingle or w/e
     - euclidean-distance
     - k means clustering starts with a big ol' map reduce, and the rest of it is full of 
        highly streamable / chunkable algorithms
     - kalman filter is incorrectly implemented right now anyways, as it should run on a collection
        iterated over
   NO! instead implement sequencer, i mean sort of idk, it'll use normalize(data).then(sequence => kalmanfilter(sequence.result)) or something
   NO! \-> convert to promise dsl for fitness function calls in clairvoyance
       \-> make a stream provider that passes data from histogram in and provides a promise / callbacks
       \-> return promise with results
   IDK! time is less the problem and more memory pressure
   IDK! -> start with a known number of data points to loop through, and measure the time it takes
      \-> store a cached map for each fitness function -> metric timing
      \-> increase iterations each update until threshold is reached
*/

console.log('before start')
// Create and start the application.
DayMaker.start();

console.log('after start')


let updateReceived = false;

let test = () => {
  let alarm = new Alarm()
  alarm.dayBuzzed = 4
  alarm.hour = 8
  alarm.minute = 30
  alarm.stepsSinceStart = -1
  
  let previousDayBuzz = ui.alarmShouldBuzz({ getDay: () => 5})
  
  return JSON.stringify({
    previousDay: `expected true, got: ${previousDayBuzz}`
  })
}

//interval for alarm polling
let alarmTimeoutId = undefined;
let alarmInterval = function() {
  let ui = DayMaker.instance.default;
  if ((updateReceived || ui.obtainedSettings) && ui.alarm.alarmShouldBuzz()) {
    clock.granularity = "seconds"
    ui.alarm.buzz()
    console.log(`buzzing, steps to go: ${ui.alarm.stepsToGo()}`)
  }
  
  ui.showOrHideWakeupImage()

  console.log(`interval time: ${ui.alarm.getTimeoutIntervalDuration() / 1000 / 60} minutes`)
  alarmTimeoutId = setTimeout(alarmInterval, ui.alarm.getTimeoutIntervalDuration())
}

alarmInterval();

// Listen for the onmessage event
//update and save settings received
messaging.peerSocket.onmessage = function({data}) {
  let ui = DayMaker.instance.default;
  
  let { name, data } = data
  
  if (name === 'settings') {
    if (ui.alarm.showBatteryLevel != data.showBatteryLevel) {
      ui.alarm.showBatteryLevel = data.showBatteryLevel
      DayMaker.instance.handlePowerLevel()
    }

    ui.alarm.saveAlarmData(data)

    ui.showOrHideWakeupImage()

    updateReceived = true

    if (alarmTimeoutId !== undefined) clearTimeout(alarmTimeoutId)
    alarmInterval()
    console.log('updated settings')
  } else if (name === 'training') {
    console.log('received new training data')
    
    let events = DayMaker.instance.clairvoyance.events
    _.keys(data, key => {
      if (key in events) {
        events[key].training = data[key]
        console.log('updated training for event, ' + key)
      }
    })
  }
  
}

// Update the clock every second / minute
clock.granularity = "seconds";//"minutes";
let clockGranularityUpdateId = null

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date

  DayMaker.instance.screen.updateReceived = updateReceived
  DayMaker.instance.screen.today = today
  DayMaker.instance.render()
  
  //if we're getting this update, it means we're rendering the clock, so we should switch it to second
  // updates, and then in 1 minute switch back to minutes, unless we render again, then reset that timer
  clock.granularity = "seconds"
  if (clockGranularityUpdateId) clearTimeout(clockGranularityUpdateId)
  clockGranularityUpdateId = setTimeout(() => clock.granularity = "minutes", 60 * 1000)
}

import { inbox } from "file-transfer"

// Event occurs when new file(s) are received
inbox.onnewfile = function (e) {
  var fileName;
  do {
    // If there is a file, move it from staging into the application folder
    fileName = inbox.nextFile();
    if (fileName) {
      
      DayMaker.instance.default.showOrHideWakeupImage()
      console.log("/private/data/" + fileName + " is now available");
      fileName = inbox.nextFile();
    }
  } while (fileName);
};