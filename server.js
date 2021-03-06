const http = require('http');
const express = require('express');
const striptags = require('striptags')
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const MongoClient = require('mongodb').MongoClient;

const app = express();
const bodyParser = require("body-parser");
const googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ',
    Promise: Promise
  });
require('dotenv').config()
const GeoHelper = require('./utils/geo_helper');

const diagnosis = require('./diagnosis.js');


const COORD_KEY = "latlon";
const ADDR_KEY = "address";
const PLACE_KEY = "place";
const DIAGNOSE_KEY = "diagnose";
const RESOURCE_KEY = "resource";
const HELPMENU_KEY = "cmd";
const validResources = ['shelter', 'food', 'medical'];

const CONNECTION_URL = `mongodb+srv://${process.env.MONGO_ACCOUNT}:${process.env.MONGO_PASSWORD}@cluster0-6ksqp.gcp.mongodb.net/test?retryWrites=true&w=majority`;
var db;

app.use(bodyParser.urlencoded({ extended: false }));

// Initialize database connection pool
console.log("Initializing mongodb connection...")
MongoClient.connect(CONNECTION_URL, {useUnifiedTopology: true}, function(err, client) {
    if(err) throw err;
    db = client.db('offlineDB');
    console.log("Successfully connected to mongodb!")
});

http.createServer(app).listen(3000, () => {
    console.log('Express server listening on port 3000');
});

app.get('/', (req, res) => {
    console.log("Successfully hit the endpoint!");
    res.end("Nice!");
})

app.post('/sms', (req, res) => {
  const responsePromise = parseRequest(req.body.Body);
  responsePromise.then((resp) => {
    const twiml = new MessagingResponse();

    let instStr = resp.join("\n");
    twiml.message(instStr);

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(twiml.toString());   
  });
});

function parseRequest(req) {
    let inputs = req.split("\n");

    let source = inputs[0];
    let srcArr = source.split(": ");
    let src_key = srcArr[0].toLowerCase();

    if (inputs.length === 1) {
        if (inputs[0].toLowerCase() === HELPMENU_KEY) {
            return createHelpMessage();
        } else if (src_key === DIAGNOSE_KEY) {
            let patientInfo =srcArr[1].split(", ");
            let yob = patientInfo[0];
            let gender = patientInfo[1];
            return diagnosis.getSymptomIds(patientInfo.slice(2), db)
            .then((symptomIds) => {
                let symptomsStr = "[" + symptomIds.toString() + "]";
                return diagnosis.diagnose(symptomsStr, gender, yob);
            });
        } else {
            console.log("invalid command");
        }
    }

    let src_val = srcArr[1].replace(/\s/g, "");

    let destination = inputs[1];
    let destArr = destination.split(": ");
    let dest_key = destArr[0].toLowerCase();
    let dest_val = destArr[1];

    if (src_key === COORD_KEY && dest_key === COORD_KEY) {
        return getDirection(src_val, dest_val.replace(/\s/g, ""));
    } else if (src_key === COORD_KEY && dest_key === ADDR_KEY) {
        return getDirection(src_val, dest_val);
    } else if (src_key === COORD_KEY && dest_key === PLACE_KEY) {
        let latlon = src_val.split(",");
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
            function onlyUnique(value, index, self) {
                return self.indexOf(value) === index;
            }
            let uniqueNames = resp.json.results.map(r => r.name).filter(onlyUnique);
            if (uniqueNames.length === 1) {
                loc = resp.json.results[0].geometry.location;
                return getDirection(src_val, loc.lat + "," + loc.lng);
            } else {
                let response = ["\n", "Did you mean:", "\n"];
                let loopCount = Math.min(5, uniqueNames.length);
                for (let i = 0; i < loopCount; i++) {
                    response.push(uniqueNames[i] + "\n");
                }
                response.push("\n Please re-query with the full name")
                return Promise.resolve(response);
            }
        })
        .catch((err) => console.log(err));
    } else if (src_key === COORD_KEY && dest_key === RESOURCE_KEY && validResources.includes(dest_val.toLowerCase())) {
        return new Promise((resolve, reject) => {
            db.collection(dest_val).find().toArray(function (err, result) {
                if (err) throw err;
                let closestResource = GeoHelper.sortAndReturnClosest(src_val, result.map(doc => doc.latlon))
                let start = "\n Directions to the closest " + dest_val + " resource:\n";
                resolve(getDirection(src_val, closestResource, start))
            })
        })

    } else {
        console.log("cannot parse for response");
    }
}

function createHelpMessage() {
    return Promise.resolve(["Commands menu:", "\n", "enter your latlon with one of these commands to get directions:", "latlon: latlon of destination", "address: address of destination", "place: title of destination", "resource: one of food, shelter or health", "\n", "enter your information into this command to get a diagnosis:", "diagnose: date of birth, gender, symptoms seperated by comma", "\n", "examples:", "latlon: 49, -123", "resource: shelter", "\n", "latlon: 49, -123", "place: McDonalds", "\n", "diagnose: 1984, male, stiff neck, fever"]);
}

function getDirection(source, dest, start = "\n ") {
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
            let instructions = striptags(step.html_instructions.replace("</b><div style=\"font-size:0.9em\">", "\n"));
            let distance = step.distance.text;
            let duration = step.duration.text;
            return instructions + " for " + distance + ` (${duration})`;
        });
        mappedSteps.unshift(start);
        return mappedSteps;
    })
    .catch((err) => console.log(err));
}
