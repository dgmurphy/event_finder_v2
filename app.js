var express = require("express");
var bodyParser = require("body-parser");
var http = require("http");
var path = require('path');
//var fs = require("fs");
var mybq = require("./lib/mybq");
var cameocodes = require("./lib/cameocodes");
var pcalc = require("./lib/pcalc");

var app = express();

//templates
app.set('views', './views');
app.set('view engine', 'pug');

var server = http.createServer(app);
app.use(express.static(path.resolve(__dirname, 'client')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
	//console.log(`${req.method} request for '${req.url}' - ${JSON.stringify(req.body)}`);
	next();
});

app.use(express.static("./public"));


// Respond by loading and parsing a locally stored file with gdelt data
app.post("/bqgdeltmock", function(req, res) {

  var eventsJsonArray = {};
  var datafile = req.body.datafile; 
  console.log("Launching MOCK GDELT Query using: " + datafile + "\n");

  mybq.queryGdeltMock(datafile, function(err, rows) {

    if (err != null) {
      var msg = "Error: Could not load datafile: " + datafile;
      res.send(msg);
      res.end();

    } else {

      console.log("Mock Big Query Status: " + err + "\n");

      rows.forEach(function(row) {
        var str = '';
        for (var key in row) {
          if (str) {
            str += '\t';
          }
          str += key + ': ' + row[key];
        }
      })

      var dataDescription = datafile;
      mybq.makeEventsJsonArray(dataDescription, rows, function(eventsRes) {
        res.send(eventsRes);
        res.end();
      });
    }

  });
  
});

// Return event details object array
app.post("/eventdetails", function(req, res) {

  var edetails = JSON.parse(req.body.events);
  var eventLookup = [];

  // Group items by sourcefile into eventLookup Array
  //  eventLookup has an array of global IDs for each source file
  edetails.forEach(function(event) {

    var srcFileAlreadyHere = false;
    eventLookup.forEach(function(lookup) {

      if (lookup.srcFile == event.sourcefile) {
        lookup.idarray.push(event.globaleventid);
        srcFileAlreadyHere = true;
      };

    });

    if(!srcFileAlreadyHere) {

      var newLookup = {};
      newLookup.srcFile = event.sourcefile;

      var newIdArr = [];
      newIdArr.push(event.globaleventid);
      newLookup.idarray = newIdArr;

      eventLookup.push(newLookup);
    }

  });

  // Each entry in rows here will have all the GDELT columns
  mybq.buildFullEventsArray(eventLookup, function(err, rows) {

    if(err != null) {
      res.send("Error: Could not build full events array.");
    } else {
      res.send(rows);
    }
  });

});

// Return the CAMEO description for a code
app.post("/cameocode", function(req, res) {

  var ccode = req.body.ccode;
  var desc = cameocodes.getCameoDescription(ccode);
  //var jdesc = JSON.stringify(desc);

  res.send(desc);

});


// An API call to Google Big Query. Use sparingly, has quotas. 
//  Requires an active google-cloud project with service credentials
app.post("/bqgdelt", function(req, res) {

  console.log("Launching GDELT Query using: " + JSON.stringify(req.body) + " \n");

  if (req.body.key == "oetsc") {

      mybq.queryGdelt(req.body, function(err,rows){

       if(err != null) {
        console.log("Big Query Status: " + err + "\n");
        res.send("bqerror");
        res.end();
      } else {

          var dataDescription = "gdeltlive.txt";   // TODO get this name from mybq

          mybq.makeEventsJsonArray(dataDescription, rows, function(eventsRes) {
              res.send(eventsRes);
              res.end();
          });
      }

     });
      
  } else {   //end keycheck
    res.send("bad key");
    res.end();
  }

});

// Return html for the given event string
app.post("/evhtml", function(req, res) {

  var eventData = JSON.parse(req.body.event);

  res.render('eventtable', cameocodes.getEventHtml(eventData));

});


app.get("/pmesiiscore", function(req,res){

  var ccode = req.query.ccode;
  pcalc.getPmesiiScore(ccode, function(pscore) {
    res.send(pscore);
    res.end();
  });

});


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});


module.exports = app;