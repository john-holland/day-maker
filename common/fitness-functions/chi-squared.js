import { log as LogGamma } from './gamma'

// The following code liberated from
// http://www.math.ucla.edu/~tom/distributions/chisq.html
// https://github.com/substack/chi-squared.js
// author: substack, license: MIT

function Gcf(X,A) {        // Good for X>A+1
  const exp = Math.exp
  const log = Math.log
  const abs = Math.abs

  var A0=0
  var B0=1
  var A1=1
  var B1=X
  var AOLD=0
  var N=0
  while (abs((A1-AOLD)/A1)>.00001) {
    AOLD=A1
    N=N+1
    A0=A1+(N-A)*A0
    B0=B1+(N-A)*B0
    A1=X*A0+N*A1
    B1=X*B0+N*B1
    A0=A0/B1
    B0=B0/B1
    A1=A1/B1
    B1=1
  }
  var Prob=exp(A*log(X)-X-LogGamma(A))*A1
  return 1-Prob
}

function Gser(X,A) {        // Good for X<A+1.
  const exp = Math.exp
  const log = Math.log

  var T9=1/A
  var G=T9
  var I=1
  while (T9>G*.00001) {
    T9=T9*X/(A+I)
    G=G+T9
    I=I+1
  }
  G=G*exp(A*log(X)-X-LogGamma(A))
  return G
}

function Gammacdf(x,a) {
  var GI;
  if (x<=0) {
    GI=0
  } else if (x<a+1) {
    GI=Gser(x,a)
  } else {
    GI=Gcf(x,a)
  }
  return GI
}

export let cdf = function (Z, DF) {
  if (DF<=0) {
    throw new Error("Degrees of freedom must be positive")
  }
  return Gammacdf(Z/2,DF/2)
}

export let pdf = function (x, k_) {
    if (x < 0) return 0
    var k = k_ / 2
    return 1 / (Math.pow(2, k) * gamma(k))
        * Math.pow(x, k - 1)
        * Math.exp(-x / 2)
    ;
}