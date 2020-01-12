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
const HELPMENU_KEY = "help";
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

http.createServer(app).listen(1337, () => {
    console.log('Express server listening on port 1337');
});

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

function parseRequest(req) {
    let inputs = req.split("\n");
    if (inputs.length === 1) {
        if (inputs[0] === HELPMENU_KEY) {
            return createHelpMessage();
        } else {
            console.log("invalid command");
        }
    }

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
    } else if (dest_key === DIAGNOSE_KEY) {
        let patientInfo = dest_val.split(", ");
        let yob = patientInfo[0];
        let gender = patientInfo[1];
        // let symptomIds = diagnosis.getSymptomIds(patientInfo.slice(2));
        console.log(patientInfo.slice(2));
        return diagnosis.getSymptomIds(patientInfo.slice(2), db)
            .then((symptomIds) => {
                let symptomsStr = "[" + symptomIds.toString() + "]";
                return diagnosis.diagnose(symptomsStr, gender, yob);
            })
    } else if (dest_key === RESOURCE_KEY && validResources.includes(dest_val)) {
        return new Promise((resolve, reject) => {
            db.collection(dest_val).find().toArray(function (err, result) {
                if (err) throw err;
                let closestResource = GeoHelper.sortAndReturnClosest(source, result.map(doc => doc.latlon))
                //TODO: add "Closest ___ is at: ..." text
                resolve(getDirection(source, closestResource))
            })
        })

    } else {
        console.log("cannot parse for response");
    }
}

function createHelpMessage() {
    return Promise.resolve(["help menu:", "enter your latitude and longitude with one of these commands:", "\n", "latlon: latlon of destination", "address: address of destination", "place: title of destination", "diagnose: date of birth, gender, symptoms seperated by comma", "resource: one of food, shelter or health", "\n", "examples:", "49, -123", "resource: shelter", "\n", "49, -123", "place: McDonalds", "\n", "49, -123", "diagnose: 1984, male, neck stiffness, stiff neck, fever"]);
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
            let instructions = striptags(step.html_instructions.replace("</b><div style=\"font-size:0.9em\">", "\n"));
            let distance = step.distance.text;
            let duration = step.duration.text;
            return instructions + " for " + distance + ` (${duration})`;
        });
        return mappedSteps;
    })
    .catch((err) => console.log(err));
}
