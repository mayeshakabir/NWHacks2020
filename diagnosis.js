var unirest = require("unirest");

var req = unirest("GET", "https://priaid-symptom-checker-v1.p.rapidapi.com/diagnosis");

const unirest_token = process.env.UNIREST_TOKEN;

function diagnose(symptoms, gender, yob) {
    return new Promise((resolve, reject) => {
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
            let issueStrs = issueObjs.map((issueObj) => 
                issueObj.Issue.Accuracy + "% chance of the " + issueObj.Issue.Name.toLowerCase()
            );
            issueStrs.push("");

            resolve(issueStrs);
        }); 
    });  
}

// TODO map symptom names to ids (in MongoDB Atlas)
function getSymptomIds(symptoms) {
    return [234, 11];
}

module.exports = {
    diagnose,
    getSymptomIds
}

// diagnose("[234, 11]", "male", "1984");