import { today as todayActivity, goals } from "user-activity"

export class StepGoalEstimation {
  getEstimation() {
    //if they haven't hit their step goal, we want to estimate how long it will take
    //
    let metersPerStep = todayActivity.local.distance / (todayActivity.local.steps || 1)
    //according to wikipedia, avg walking speed is 1.4 meters per second
    //  soooooooo we can estimate metersPerStep by 
    let stepsToGo = Math.max(goals.steps - (todayActivity.local.steps || 0), 0)
    
    let message = 'Goal! Way to go!'
    if (stepsToGo > 0) {
      let metersToGo = metersPerStep * stepsToGo
      let secondsTillGoalReached = metersToGo / 1.4
      let minuteWalk = Math.ceil(secondsTillGoalReached / 60)

      let hour = Math.floor(minuteWalk / 60)
      let minute = minuteWalk - hour * 60
      minute = minute < 10 ? '0' + minute : minute
      message = `walk for ${hour}:${minute} to reach your goal!`
    }
    
    return message
  }
  
  getStepsToGo() {
    return Math.max(goals.steps - (todayActivity.local.steps || 0), 0)
  }
}