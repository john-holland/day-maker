'use strict'

/**
  https://github.com/NathanEpstein/clusters
  License: MIT
*/

export const clusterMaker = {

  data: getterSetter([], function(arrayOfArrays) {
    var n = arrayOfArrays[0].length;
    return (arrayOfArrays.map(function(array) {
      return array.length == n;
    }).reduce(function(boolA, boolB) { return (boolA & boolB) }, true));
  }),

  clusters: function() {
    var pointsAndCentroids = kmeans(this.data(), {k: this.k(), iterations: this.iterations() });
    var points = pointsAndCentroids.points;
    var centroids = pointsAndCentroids.centroids;
//sequencer add
    return centroids.map(function(centroid) {
      //sequencer add
      return {
        centroid: centroid.location(),
        points: points.filter(function(point) { return point.label() == centroid.label() }).map(function(point) { return point.location() }),
      };
    });
  },

  k: getterSetter(undefined, function(value) { return ((value % 1 == 0) & (value > 0)) }),

  iterations: getterSetter(Math.pow(10, 3), function(value) { return ((value % 1 == 0) & (value > 0)) }),

};

function kmeans(sequencer, data, config) {
  //sequencer add, 0
  // default k
  let k, iterations, points, centroids
  sequencer.enqueue(() => {
    k = config.k || Math.round(Math.sqrt(data.length / 2));
    iterations = config.iterations;
  }, data, 0)

  //sequencer enqueue, 1
  // initialize point objects with data
  sequencer.enqueue(() => {
    points = data.map(function(vector) { return new Point(vector) });
  }, points, 1)
 
  //sequencer enqueue, 1
  // intialize centroids randomly
  sequencer.enqueue(() => {
    centroids = []
    for (var i = 0; i < k; i++) {
      centroids.push(new Centroid(points[i % points.length].location(), i));
    };
  }, points, 1)

  //sequencer add, 1
  // update labels and centroid locations until convergence
  //sequencer.add(() => {
  //}, points, 2)

  //because this was a prohibitively expensive call, we'll break this for loop up into a schedule of sequences
  // iterate should be used for anything expected to require more than 37000 operations
  sequencer.iterate(0, iter => iter < iterations, iter => iter+1,
    iter => {
      //sequencer insert, 3, maybe 2? reverse loop for sequence eval?
      //nested continuation might be better here?
      // otherwise we'll have to lift a variable in each iteration of the loop, and that could get relatively expensive
      // whereas nesting the continuation would mean that variables for each point / centroid won't get created until the current sequence is evaluated
      points.forEach(function(point) { point.updateLabel(centroids) });
      centroids.forEach(function(centroid) { centroid.updateLocation(points) });
    }, points, 1)

  //sequencer add, 0
  // return points and centroids
  sequencer.enqueue(() => sequence.resolve({
    points: points,
    centroids: centroids
  }), [], 0)
};

// objects
function Point(location) {
  var self = this;
  this.location = getterSetter(location);
  this.label = getterSetter();
  this.updateLabel = function(centroids) {
    var distancesSquared = centroids.map(function(centroid) {
      return sumOfSquareDiffs(self.location(), centroid.location());
    });
    self.label(mindex(distancesSquared));
  };
};

function Centroid(initialLocation, label) {
  var self = this;
  this.location = getterSetter(initialLocation);
  this.label = getterSetter(label);
  this.updateLocation = function(points) {
    var pointsWithThisCentroid = points.filter(function(point) { return point.label() == self.label() });
    if (pointsWithThisCentroid.length > 0) self.location(averageLocation(pointsWithThisCentroid));
  };
};

// convenience functions
function getterSetter(initialValue, validator) {
  var thingToGetSet = initialValue;
  var isValid = validator || function(val) { return true };
  return function(newValue) {
    if (typeof newValue === 'undefined') return thingToGetSet;
    if (isValid(newValue)) thingToGetSet = newValue;
  };
};

function sumOfSquareDiffs(oneVector, anotherVector) {
  var squareDiffs = oneVector.map(function(component, i) {
    return Math.pow(component - anotherVector[i], 2);
  });
  return squareDiffs.reduce(function(a, b) { return a + b }, 0);
};

function mindex(array) {
  var min = array.reduce(function(a, b) {
    return Math.min(a, b);
  });
  return array.indexOf(min);
};

function sumVectors(a, b) {
  return a.map(function(val, i) { return val + b[i] });
};

function averageLocation(points) {
  var zeroVector = points[0].location().map(function() { return 0 });
  var locations = points.map(function(point) { return point.location() });
  var vectorSum = locations.reduce(function(a, b) { return sumVectors(a, b) }, zeroVector);
  return vectorSum.map(function(val) { return val / points.length });
};