var MongoClient = require('mongodb').MongoClient;
var db;

// Initialize connection once
MongoClient.connect("mongodb://localhost:27017", function(err, client) {
  if(err) throw err;
  db = client.db('pugDB');

  db.collection('test').find().toArray(function (err, result) {
    if (err) throw err

    console.log(result)
  })
});
