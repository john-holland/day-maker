import { _ } from './lfn'

const noop = () => {}

/**
A generic sequencer designed to allow for processor / memory heavy on a lighter load
Sequences should be as lazy as possible to defer massive allocations 
If it helps at all, think about sequence like a promise with specific functionality for lists, and complexity 
*/
class Sequence {
    sequences = []
    name = ""
    result = undefined

    constructor(name) {
        this.name = name
    }

    insertAt(sequence, data, index, cyclomaticComplexity) {
        this.sequences.splice(index, 0, {
            exec: sequence,
            data: data,
            cyclomaticComplexity: cyclomaticComplexity
        }, index)
    }

    append(sequence, data, cyclomaticComplexity) {
        this.sequences.push({
            exec: sequence,
            data: data,
            cyclomaticComplexity: cyclomaticComplexity
        })
    }

    add(sequence, data, cyclomaticComplexity) {
      this.append(sequence, data, cyclomaticComplexity)
    }

    enqueue(sequence, data, cyclomaticComplexity) {
        this.sequences.splice(0, 0, {
            exec: sequence,
            data: data,
            cyclomaticComplexity: cyclomaticComplexity
        })
    }

    /**
     * Creates a sequence for each iteration of the loop
     * @param {int} initial the initial value
     * @param {function<bool>} predicate loop predicate
     * @param {function<int>} incrementer the new value for the index
     * @param {function<func or value>} sequence a function
     * @param {value} data the value for the method
     * @param {int} cyclomaticComplexity the cyclomatic complexity for each iteration
     
     * @note this should be improved to handle variable range inputs - say you have to iterate through
     *   many thousands of inputs, you could set max per iteration to 50, and it could use that to fill
     *   the left over processing space, maybe pass it as a param to the exec function
     */
    iterate(initial, predicate, incrementer, sequence, data, cyclomaticComplexity) {
        //we want to add a sequence that iterates over the sequence, pushing another iteration if !!predicate()
        let index = initial
        this.append(() => {
            if (predicate(index)) {
                let result = sequence()
                
                index = incrementer(index)
                this.iterate(initial, predicate, incrementer, sequence, data, cyclomaticComplexity)
            }
        }, data, cyclomaticComplexity)
    }

    resolve(value) {
        //resolve with a value, ending exec of this sequence
        this.result = value
        this.sequences = []
        if (this.thens.length > 0) {
          this.thens.forEach(then => then(this.result, null))
        }
        return this
    }

    reject(error) {
        this.sequences = []
        if (this.thens.length > 0) {
          this.thens.forEach(then => then(undefined, error))
        }
        return this
    }

    then(func = noop) {
      return new Promise((resolve, reject) => {        
        this.thens.push((result, error) => {
          if (error) {
            reject(error)
            return
          }
          
          resolve(func(result))
        })
      })
    }
    
    exec() {
        if (this.sequences.length > 0) {
            return this.sequences.unshift()()
        } else {
            return undefined
        }
    }

    execDesc() {
      if (this.sequences.length > 0) {
        return this.sequences.pop()()
      } else [
        return undefined
      ]
    }

    hasExec() {
        return this.sequences.length > 0
    }
}

const MAX_COMPLEXITY = 37000
class SequencePriorityQueue {
    sequences = []

    addSequence() {

    }

    completeSequence() {
        return new Promise((resolve, reject) => {
            //we can only handle ~37000 iterations per main loop exec
            // what does that mean for the sequencer?
            // uh, it means that we should pay attention to the cyclomatic complexity vs the data size
            // our highest granularity data set will be heart rate / acc / gyrometer
            // highest == 60 / minute .. 1 / second -> highest duration is 30 minutes -> 30 * 60 = 1800
            // so perhaps we should take the length of the dataset * sequence.cyclomaticComplexity
            // datasets that have no cyclomatic complexity or constant speed, should return 0
            // this is a problem though, as 193 ^ 2 === 37249, so possibly we should be returning earlier, 
            // and the fitness functions will get super muddy with continuations and counters.
            this.scheduleSequence(resolve)
        })
    }

    scheduleSequence(resolve) {
        this.sequenceIntervalId = setTimeout(() => {
            this.getSequencesToExec().forEach(s => s.exec())

            if (_.all(this.sequence, s => !s.hasExec())) {
                clearTimeout(this.sequenceIntervalId)
                resolve(this.sequences.reduce((m,c) => m[c.name] = c.result, {}))
            } else {
                this.scheduleSequence()
            }
        }, 1000)
    }

    getSequencesToExec() {
        let sum = 0
        return _.sortBy(sequences, s => s.cyclomaticComplexity).reduce((memo, curr) => {
            //don't include this sequence if we already got a result, or if exec is null
            if (curr.result !== undefined || curr.sequence === undefined) {
                return memo
            }

            let currentComplexity = Math.pow(typeof curr.data === 'number' ? curr.data : curr.data.length, curr.cyclomaticComplexity)

            if (currentComplexity > MAX_COMPLEXITY) {
                throw new Error('MAX_COMPLEXITY exceeded by sequence ' + curr.name + ' with complexity count: ' + currentComplexity)
            }

            //otherwise just include it if adding it means we're under the max complixity 
            if (sum + currentComplexity <= MAX_COMPLEXITY) {
                sum += currentComplexity
                memo.push(curr)
            }

            return memo
        }, [])
    }
}

/**

function complexFunction(sequencer, data) {
    let someResult = null
    sequencer.add(() => {
        someResult = data.map(d => complexStuff(d))

        sequencer.add(() => {
            //if data is mutated or reliant on a lower scope
            //nested sequencer.add is a good call
            someResult = someResult.map(d => moreComplexStuff(d))
        }, data, 2)
    }, data, 2) //powers

    //otherwise, procedural calls are fine
    sequencer.add(() => {
        let fitness = someResult.map(d => soMuchComplexityWowVeryMath(d)).reduce(fitnessssss)

        return snakes(fitness).bunchOfSnakes(WHY_ALWAYS_SNAKES("?"))
    }, 3)

    return sequencer
}

function schedulingExample() {
    let sequencer = SequencePriorityQueue()
    sequencer.addSequence(complexFunction(new Sequencer("complexFunction"), slightlyConfusingMetricDataOrTraining))

    sequencer.completeSequence().then(results => {
        //probably change results set to include name or just make a map or add names
        rejoiceAsItisSecondsLaterButWeveDoneCoolMath(results)
    })
}


**/