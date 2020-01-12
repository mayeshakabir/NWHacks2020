var unirest = require("unirest");
const MongoClient = require('mongodb').MongoClient;
require('dotenv').config()

var req = unirest("GET", "https://priaid-symptom-checker-v1.p.rapidapi.com/diagnosis");

const unirest_token = process.env.UNIREST_TOKEN;

function diagnose(symptoms, gender, yob) {
    return new Promise((resolve, reject) => {
        console.log("symptoms: \n");
        console.log(symptoms);
        req.query({
            "symptoms": symptoms,
            "gender": gender,
            "year_of_birth": yob,
            "language": "en-gb"
        });
        
        req.headers({
            "x-rapidapi-host": "priaid-symptom-checker-v1.p.rapidapi.com",
            "x-rapidapi-key": unirest_token,
        });
        
        req.end(function (res) {
            if (res.error) reject(new Error(res.error));

            let issueObjs = res.body;
            if (res.body.length > 0) {
                let issueStrs = issueObjs.map((issueObj) =>
                    issueObj.Issue.Accuracy + "% chance of the " + issueObj.Issue.Name.toLowerCase()
                );

                resolve(issueStrs);
            } else {
                resolve(["We could not diagnose you with the given symptoms"]);
            }
        }); 
    });  
}

// TODO map symptom names to ids (in MongoDB Atlas)
// function getSymptomIds(symptoms) {

//     return [234, 11];
// }

function getSymptomIds(symptoms, db) {
    return new Promise((resolve, reject) => {
        db.collection("symptoms").find({"Name": { $in: symptoms}})
            .toArray(function (err, result) {
                if (err) throw err;
                resolve(result.map(r => r.ID));
            })
    });
}

module.exports = {
    diagnose,
    getSymptomIds
}

// diagnose("[234, 11]", "male", "1984");

