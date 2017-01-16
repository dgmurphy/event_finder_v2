'use strict';
var async = require("async");
var pcalc = require("./pcalc");

const readline = require('readline');
var fs = require('fs');

// See the Google Cloud developer documentation to set up a project
//  and service key credentials
var bigquery = require('@google-cloud/bigquery')({
  projectId: 'oeeventfinder3',
  keyFilename: '../sensitive_data/big_query_keyfile.json'
});


function printExample (rows) {
  console.log('Query Results:');
  rows.forEach(function (row) {
    var str = '';
    for (var key in row) {
      if (str) {
        str += '\t';
      }
      str += key + ': ' + row[key];
    }
    console.log(str);
  });
}


function readAsync (pathAndIds, callback) {

  var srcFilePath = pathAndIds.srcFilePath;
  var globalIDs = pathAndIds.globalIDs;

  var rows = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(srcFilePath)
  });     

      // For each line, see if the global event ID is a match
      rl.on('line', function (line) {
        //var cleanLine = line.replace(/\"/g, '');
        var rowJson = JSON.parse(line);

        if(globalIDs.indexOf(rowJson.GLOBALEVENTID) > -1) {
          rows.push(rowJson);
        }

      });    

      rl.on('close', function() {
        callback(null, rows);   // null = no err
      });

      rl.on('error', function(e) {
        callback("Error reading input file!", null);
      });

} // readAsync


module.exports = {


  // This calls the Google Big Query API
  queryGdelt: function (inputs, callback) {

    var datafile = "gdeltlive.txt";
    var datapath = "./data/" + datafile;

    // See GDELT FractioDate field documentation
    var yearFloat = parseFloat(inputs.year);
    var monthFloat = parseFloat(inputs.month);
    var dayFloat = parseFloat(inputs.day);
    var yearFraction = (monthFloat * 30.0 + dayFloat) / 365.0;
    var fractionStartDate = yearFloat + yearFraction;
    var fractionEndDate = fractionStartDate + 0.003;   // span approx 1 day
    var limit = inputs.limit;

     // Here's the select call. Test it in the Big Query Web UI first: 
     //   https://cloud.google.com/bigquery/bigquery-web-ui
     var query = "SELECT * FROM  [gdelt-bq:full.events] " + 
                 "WHERE FractionDate > " + fractionStartDate + " AND FractionDate < " + fractionEndDate + 
                 " AND ActionGeo_Lat is not null " + "AND ActionGeo_Lat > 35.68 AND ActionGeo_Lat < 50.15" +
                 " AND ActionGeo_Long > 28.67 AND ActionGeo_Long < 53.24 " +
                 "ORDER BY GLOBALEVENTID " + 
                 "LIMIT " + limit + ";";

     console.log("Here's the GDELT SELECT Command: " + query);

     // Set to true to enable the call (false for testing)
     var bqEnabled = true;

     if (bqEnabled) {

       bigquery.query(query, function (err, rows) {

        if (err) {
          return callback(err);
        }

        // Save this to a file for full event lookup purposes
        var wstream = fs.createWriteStream(datapath);

        // Make a response row array that includes the source data file name
        var rrows = [];

        rows.forEach(function (row) {

          wstream.write(JSON.stringify(row) + '\n');

          //var cleanLine = line.replace(/\"/g, '');
          //var rowJson = JSON.parse(line);
          var rowJson = row;
          rowJson.ActionGeo_Lat = parseFloat(rowJson.ActionGeo_Lat);
          rowJson.ActionGeo_Long = parseFloat(rowJson.ActionGeo_Long);
          rowJson.AvgTone = parseFloat(rowJson.AvgTone);
          rowJson.EventCode = rowJson.EventCode;
          rowJson.sourceFile = datafile;
          rowJson.globaleventid = rowJson.GLOBALEVENTID;
          rrows.push(rowJson);          

        });
        wstream.end();

        wstream.on('finish', function () {
          callback(null, rrows);
        });

      });

     } else { // BQ NOT ENABLED

      callback(null, null); // this will 500 err

     }

   },

   // This loads gdelt data from a file on the server
   queryGdeltMock: function (datafile, callback) {

    console.log("IN GDELT MOCK");
    var dataPath = "./data/" + datafile;

    // check this file exists
   fs.stat(dataPath, function(err,stats) {

      if ( err != null ) {

        callback("Error reading input file!", null);

      } else {
  
        // read from a file of pre-downloaded data
        var rows = [];

        const rl = readline.createInterface({
          input: fs.createReadStream(dataPath)
        });

        rl.on('line', function (line) {
          //var cleanLine = line.replace(/\"/g, '');
          var rowJson = JSON.parse(line);
          rowJson.ActionGeo_Lat = parseFloat(rowJson.ActionGeo_Lat);
          rowJson.ActionGeo_Long = parseFloat(rowJson.ActionGeo_Long);
          rowJson.AvgTone = parseFloat(rowJson.AvgTone);
          rowJson.EventCode = rowJson.EventCode;
          rowJson.sourceFile = datafile;
          rowJson.globaleventid = rowJson.GLOBALEVENTID;
          rows.push(rowJson);
        });

        rl.on('close', function() {
          callback(null, rows)
        });

        rl.on('error', function(e) {
          callback("Error reading input file!", null);
        });


      }

    });

   },

   // Turn the API response (or file rows) into JSON
   makeEventsJsonArray: function(dataDescription, rows, sendResCallback) {

    var jsonResp = {};
    var eventsJsonArray = [];

    pcalc.loadPmesiiScores(function(pmesiiDict) {

      rows.forEach(function(event) {
        var point = {
          lat: event.ActionGeo_Lat,
          long: event.ActionGeo_Long,
          tone: event.AvgTone,
          eventcode: event.EventCode,
          pmesiiscore: pmesiiDict[event.EventCode],
          sourcefile: event.sourceFile,
          globaleventid: event.globaleventid,
          goldstein: event.GoldsteinScale,
          eth1: event.Actor1EthnicCode,
          eth2: event.Actor2EthnicCode,
          rel1: event.Actor1Religion1Code,
          rel2: event.Actor2Religion1Code,
          rol1: event.Actor1Type1Code,
          rol1: event.Actor2Type1Code
        };

        eventsJsonArray.push(point);

      });

      jsonResp.status = "Request for '" +
      dataDescription + "' returned " + rows.length + " events.";
      jsonResp.events = eventsJsonArray;

      // PMESII Histogram
      var phist = pcalc.makeHistogram(eventsJsonArray);

      jsonResp.phist = phist;

      sendResCallback(jsonResp);

    });

  },

  buildFullEventsArray: function(eventLookup, callback) {

    var pathsAndIds = [];

    // Build an object to pass to the file parser
    eventLookup.forEach(function(event) {

      var pandis = {};
      pandis.srcFilePath = "./data/" + event.srcFile;
      pandis.globalIDs = event.idarray;
      pathsAndIds.push(pandis);

    });

    // Collect the rows from the source files
    async.map(pathsAndIds, readAsync, function(err, results) {

      if (err != null) {

        callback("Error reading files", null);

      } else {

        var response = [];
        // readAsync is returning an array of arrays (1 array for each sourcefile),
        //  so combine them here (TODO: eliminate duplicate IDs)
        results.forEach(function(resultArr) {
          resultArr.forEach(function(result){
            response.push(result);
          });
        });

        callback(null, response); // no errors
      }

    }); 
  } //buildFullEventsArray





}

  