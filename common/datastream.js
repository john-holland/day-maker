class DataStream {
  constructor(method, accessor, fitness, limit = 32, interval = 32) {
    this.method = method
    this.accessor = accessor
    this.limit = limit
    this.interval = interval
    this.fitness = fitness
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      let index = 0
      this.intervalId = setInterval(() => {
        this.method(this.accessor(index, this.limit), this.fitness)
      }, this.interval)
    })
  }
  
  static for(method, accessor, fitness, limit = 32, interval = 32) {
    return new DataStream(method, accessor, fitness, limit, interval).start()
  }
}

  let dsf = DataStream.for
  
    let ex = {
      'jerky':  (data, fitness, training) => {
        return [data, Promise.all([
            dsf(normalize, (i, l) => training.slice(i, l), fitness), 
            dsf(normalize, (i, l) => data.slice(i, l), fitness)])
                .then(results => dsf(_knn, (i, l) => results.map(r => r.slice(i, l))))
        }
    }

function datastream() {
  method(data)
}

//accept a method to call as a reduce, using an interval to break up calculations