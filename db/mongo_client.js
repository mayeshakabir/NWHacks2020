require('dotenv').config({path:"../.env"})
const MongoClient = require('mongodb').MongoClient;
var db;

const CONNECTION_URL = `mongodb+srv://${process.env.MONGO_ACCOUNT}:${process.env.MONGO_PASSWORD}@cluster0-6ksqp.gcp.mongodb.net/test?retryWrites=true&w=majority`;

// Initialize connection once
MongoClient.connect(CONNECTION_URL, function(err, client) {
  if(err) throw err;
  db = client.db('offlineDB');

  db.collection('test').find().toArray(function (err, result) {
    if (err) throw err

    console.log(result)
  })
});
