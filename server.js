const http = require('http');
const express = require('express');
const striptags = require('striptags')
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
const bodyParser = require("body-parser");
const googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ',
    Promise: Promise
  });

app.use(bodyParser.urlencoded({ extended: false }));

const COORD_KEY = "latlon";
const ADDR_KEY = "address";
const PLACE_KEY = "place";

app.post('/sms', (req, res) => {
  const responsePromise = parseRequest(req.body.Body);
  responsePromise.then((resp) => {
    const twiml = new MessagingResponse();

    let instStr = resp.join("\n");

    /*
    resp.forEach(inst => {
        twiml.message(inst);
    });
    */
   twiml.message(instStr);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());   
  });
});

http.createServer(app).listen(1337, () => {
  console.log('Express server listening on port 1337');
});

function parseRequest(req) {
    let inputs = req.split("\n");
    let source = inputs[0].replace(/\s/g, "");
    let destination = inputs[1];

    let srcDestArr = destination.split(": ");
    let dest_key = srcDestArr[0];
    let dest_val = srcDestArr[1];

    if (dest_key === COORD_KEY) {
        return getDirection(source, dest_val.replace(/\s/g, ""));
    } else if (dest_key === ADDR_KEY) {
        return getDirection(source, dest_val);
    } else if (dest_key === PLACE_KEY) {
        let latlon = source.split(",");
        let lat = Number(latlon[0]);
        let lon = Number(latlon[1]);
        return googleMapsClient.places({
            query: dest_val,
            language: 'en',
            location: [lat, lon],
            radius: 1000
        })
        .asPromise()
        .then((resp) => {
            loc = resp.json.results[0].geometry.location;
            return getDirection(source, loc.lat + "," + loc.lng);
        })
        .catch((err) => console.log(err));
    } else {
        console.log("cannot parse for response");
    }
}

function getDirection(source, dest) {
    return googleMapsClient.directions({
        origin: source,
        destination: dest,
        mode: 'walking',
        language: 'en',
        units: 'metric',
    })
    .asPromise()
    .then((resp) => {
        let steps = resp.json.routes[0].legs[0].steps;
        let mappedSteps = steps.map((step) => {
            let instructions = striptags(step.html_instructions);
            let distance = step.distance.text;
            let duration = step.duration.text;
            return instructions + " for " + distance + ` (${duration})`;
        });
        return mappedSteps;
    })
    .catch((err) => console.log(err));
}
