const geolib = require('geolib')

module.exports = {
  sortAndReturnClosest: function(source, aCoordinates) {
    if (aCoordinates.length === 1) return aCoordinates[0];
    else {
      let latlon = source.split(",");
      let lat = Number(latlon[0]);
      let long = Number(latlon[1]);
  
      aCoordinates.sort((a, b) => {
        let latlonA = a.split(",");
        let latA = Number(latlonA[0]);
        let lonA = Number(latlonA[1]);
  
        let latlonB = b.split(",");
        let latB = Number(latlonB[0]);
        let lonB = Number(latlonB[1]);
    
        var aDist = geolib.getDistance({ "latitude": lat, "longitude": long}, { "latitude": latA, "longitude": lonA}, 1)
        var bDist = geolib.getDistance({ "latitude": lat, "longitude": long}, { "latitude": latB, "longitude": lonB}, 1)
    
        return bDist > aDist ? 1 : 0;
      })
    }
  
    return aCoordinates[0];
  }
}
