/**

https://github.com/zeke/euclidean-distance
LICENSE: wtfpl - http://www.wtfpl.net/

*/

let distanceSquared = function (a, b) {
  var sum = 0
  var n
  for (n = 0; n < a.length; n++) {
    sum += Math.pow(a[n] - b[n], 2)
  }
  return sum
}

let euclideanDistance = function (a, b) {
  return Math.sqrt(distanceSquared(a,b))
}

export {
  distanceSquared,
  euclideanDistance
}