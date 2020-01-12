const https = require('https')
const striptags = require('striptags')

// TODO: on completion, call Twilio API with the directions
function getDirections(url) {
  https.get(url, res => {
    // Continuously update stream with data
    var body = '';
    res.on('data', (d) => {
      body += d;
    });

    res.on('end', () => {
      var parsed = JSON.parse(body);

      var steps = parsed["routes"][0]["legs"][0]["steps"];
      var instructions = steps.map(s =>{
        var instructions = striptags(s["html_instructions"])
        var distance = s["distance"]["text"]
        var duration = s["duration"]["text"]
        
        return instructions + " for " + distance + ` (${duration})`
      })
      var warnings = parsed["routes"][0]["warnings"]
      var response = {
        "instructions": instructions,
        "warnings": warnings
      }

      console.log(response);
    });
  }).on('error', (e) => {
    console.error(e);
  })
}

getDirections("https://maps.googleapis.com/maps/api/directions/json?origin=49.2620347,-123.2448703&destination=49.2666467,-123.2425376&mode=walking&key=AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ")
