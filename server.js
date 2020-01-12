const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));

const COORD_KEY = "latlon";
const ADDR_KEY = "address";
const PLACE_KEY = "place";
const DIR_URL_TEMPLATE = "https://maps.googleapis.com/maps/api/directions/json?origin={1}&destination={2}&mode=walking&key=AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ";
const PLACES_URL_TEMPLATE = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={1}&radius=1000&keyword={2}&key=AIzaSyAm60CAKzUos3SAZqw0u1TjqZmg2JwvdCQ;"

app.post('/sms', (req, res) => {
  const twiml = new MessagingResponse();
  const response = parseRequest(req.body.Body);

  twiml.message('The Robots are coming! Head for the hills!');

  res.writeHead(200, {'Content-Type': 'text/xml'});
  res.end(twiml.toString());
});

http.createServer(app).listen(1337, () => {
  console.log('Express server listening on port 1337');
});

function parseRequest(req) {
    let inputs = req.split("\n");
    let url = buildURL(inputs[0], inputs[1], DIR_URL_TEMPLATE);
    //make call here
    console.log(`built URL: ${url}`);
}

function buildURL(sourceStr, destinationStr, url) {
    let srcDestArr = destinationStr.split(": ");
    let dest_key = srcDestArr[0];
    let dest_val = srcDestArr[1];
    
    url = url.replace("{1}", sourceStr.replace(/\s/g, ""));

    if (dest_key === COORD_KEY) {
        url = url.replace("{2}", dest_val.replace(/\s/g, ""));
    } else if (dest_key === ADDR_KEY) {
        url = url.replace("{2}", dest_val.replace(/\s/, "+"));
    } else if (dest_key === PLACE_KEY) {
        let place_dest = parsePlaceRequest(PLACES_URL_TEMPLATE, sourceStr, dest_val);
        url = url.replace("{2}", place_dest.replace(/\s/g, ""));
    } else {
        console.log("cannot parse for url");
    }

    return url;
}

function parsePlaceRequest(url, source_val, dest_val) {
    url = url.replace("{1}", source_val.replace(/\s/g, ""));
    url = url.replace("{2}", dest_val.replace(/\s/, "+"));
    // GET and return
}