import { _ } from './underscore.js'
import { euclideanDistance } from './euclidean-distance.js'

import { clusterMaker } from './k-means-clustering.js'

//  maybe we want to do the following:
/**

      keeping in mind that we just want the fitness value returned
      we could use k-clustering, assign several random centroids
      do the centroid association thing for our training set
      
      do the same thing for the data set
      
      keeping variance (max distance between data points) as threshold,
      
*/

export {
    _knn(training, data) {
      const centroid_count = 5

      clusterMaker.k(centroid_count);

      clusterMaker.iterations(500);
      //number of iterations (higher number gives more time to converge), defaults to 1000

      //data from which to identify clusters, defaults to []
      clusterMaker.data(massageDataSet(training))
      let trainingCentroids = clusterMaker.clusters()
      //TODO: make sure this gets overwritten
      clusterMaker.data(massageDataSet(data))
      let dataCentroids = clusterMaker.clusters()

    // { centroid: [10.5 , 11], points: [[10, 10], [11, 12]] },
    // { centroid: [-9.5, 10.5], points: [[-10, 10], [-9, 11]] },
    // { centroid: [0.3333333333333333, 0.3333333333333333], points: [[1, 0], [0, 1], [0, 0]] }

      //maybe optimize
      let maxDistance = _.max(dataCentroids, dc => _.max(trainingCentroids, tc => euclideanDistance(dc.centroid, tc.centroid)))
      let fitness = _.sum(dataCentroids.map(dc => 1 - _.min(trainingCentroids, tc => euclideanDistance(dc.centroid, tc.centroid)) / maxDistance)) / centroid_count
      return fitness
  }
}