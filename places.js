const https = require('https')

function getCoordinatesFromPlace(url) {
  https.get(url, (res) => {
    // Continuously update stream with data
    var body = '';
    res.on('data', (d) => {
      body += d;
    });

    res.on('end', () => {
      var parsed = JSON.parse(body);
      var coords = parsed["results"][0]["geometry"]["location"];
      console.log(coords);
    });
  }).on('error', (e) => {
    console.error(e);
  })
}

getCoordinatesFromPlace("https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=49.2620347,-123.2448703&radius=1000&keyword=mcd&key=AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ")