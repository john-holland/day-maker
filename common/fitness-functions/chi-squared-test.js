import chi from './chi-squared.js'

//https://github.com/chipbell4/chi-squared-test
// contributors: chipbell4, JMontagu - license: MIT

/**
 * Calculates a single chi-squared term in the sum for a single observation and expected value
 *
 * @param observed The observed frequency count
 * @param expected The expected frequency count
 */
var calculateSingleChiSquaredTerm = function(observed, expected) {
    return Math.pow(observed - expected, 2) / expected
};

/**
 * Calculates the chi-squared statistic for a given list of observations and corresponding expectations
 *
 * @param observations The observation list
 * @param expectations The list of expectations
 */
var calculateChiSquaredStatistic = function(observations, expectations) {
    var resultSet = {
        chiSquared: 0,
        terms: []
    }
    
    var N = observations.length;
    for(var i = 0; i < N; i++) {
        var singleTerm = calculateSingleChiSquaredTerm(observations[i], expectations[i])
        resultSet.terms.push(singleTerm)
        resultSet.chiSquared += singleTerm
    }

    return resultSet
};

/**
 * Calculates the probability of a given observation set fitting another distribution, via a Pearson's Chi-Squared test
 *
 * @param observations              The list of observations
 * @param expectations              The list of expected values
 * @param degreesOfFreedomReduction The reduction in degrees of freedom. In general this is p + 1, where p is the number
 *                                  of parameters estimated
 */
let chiSquaredTest = function(observations, expectations, degreesOfFreedomReduction) {
  var degreesOfFreedom = observations.length - degreesOfFreedomReduction

  var resultSet = calculateChiSquaredStatistic(observations, expectations)
  resultSet.probability = 1 - chi.cdf(resultSet.chiSquared, degreesOfFreedom)
  return resultSet;
}

export {
  chiSquaredTest: chiSquaredTest,
  chiSquaredFitness(data, training) {
    return chiSquaredTest(data, training, 1).probability
  }
}

/**
example!
var chiSquaredTest = require('chi-squared-test');

// We expect a fair die
var expected = [2, 2, 2, 2, 2, 2];

// Looks pretty unfair...
var observed = [6, 3, 3, 0, 0, 0];

// Reduction in degrees of freedom is 1, since knowing 5 categories determines the 6th
var reduction = 1;

var probability = chiSquaredTest(observed, expected, reduction).probability;
// Gives 0.010362, which indicates that it's unlikely the die is fair 

// However, something a little more likely
observed = [1, 2, 4, 4, 2, 1];
probability = chiSquaredTest(observed, expected, reduction).probability;
// Gives back 0.415881, which is indicates that they did come from the same distribution (by most statistical standards)

*/