'use strict';

const readline = require('readline');
var fs = require('fs');

function incEthnicity(ethnicities, ethnicity) {

      if (!ethnicity)
        return ethnicities;

       var foundEth = false;
        ethnicities.forEach(function (eth) {
          if (eth.name == ethnicity) {
            eth.count++;
            foundEth = true;
          } 
        });
        if (!foundEth) {
          var eth = {};
          eth.name = ethnicity;
          eth.count = 1;
          ethnicities.push(eth);
        }

        return ethnicities;
}

module.exports = {

  loadPmesiiScores: function(callback) {

    console.log("Loading PMESII Dictionary");

    var pmesiiFile = "./data/CAMEO.PMESIIPT.txt";
    var pmesiiDict = {}; // CAMEO to PMESII Score mapping

    const rl = readline.createInterface({
      input: fs.createReadStream(pmesiiFile)
    });

    var pmesiiDict = {};
    rl.on('line', function (line) {
      var cleanLine = line.replace(/\"/g, '');
      if (cleanLine.startsWith("PMESII-PT")) { return true; }  // a JQuery 'continue'
      var strarr = cleanLine.split(/\s/g);
      var pmesiiScore = strarr[0];
      var cameoCode = strarr[1];
      pmesiiDict[cameoCode] = pmesiiScore;
    });

    rl.on('close', function() {
      callback(pmesiiDict);
    });

  },

  getPmesiiScore: function(ccode, callback) {
      var pscore = "error in pcalc.getPmesiiScore";
      this.loadPmesiiScores(function(pmesiiDict) {
        pscore = pmesiiDict[ccode];
        callback(pscore);
      });
  },

  makeHistogram: function(events) {
      
      var poltotal = 0.0;
      var miltotal = 0.0;
      var ecototal = 0.0;
      var soctotal = 0.0;
      var inftotal = 0.0;
      var ifrtotal = 0.0; 
      var phytotal = 0.0;
      var timtotal = 0.0;

      var phist = {
        pol: 0.0,
        mil: 0.0,
        eco: 0.0,
        soc: 0.0,
        inf: 0.0,
        ifr: 0.0,
        phy: 0.0,
        tim: 0.0
      };

      var ethnicities = [];

      events.forEach(function(event) {
        poltotal += parseFloat(event.pmesiiscore.charAt(0));
        miltotal += parseFloat(event.pmesiiscore.charAt(1));
        ecototal += parseFloat(event.pmesiiscore.charAt(2));
        soctotal += parseFloat(event.pmesiiscore.charAt(3));
        inftotal += parseFloat(event.pmesiiscore.charAt(4));
        ifrtotal += parseFloat(event.pmesiiscore.charAt(5));
        phytotal += parseFloat(event.pmesiiscore.charAt(6));
        timtotal += parseFloat(event.pmesiiscore.charAt(7));

        // update ethinicity histogram
        ethnicities = incEthnicity(ethnicities, event.eth1);
        ethnicities = incEthnicity(ethnicities, event.eth2);

      });
      
      phist.pol = poltotal / events.length;
      phist.mil = miltotal / events.length;
      phist.eco = ecototal / events.length;
      phist.soc = soctotal / events.length;
      phist.inf = inftotal / events.length;
      phist.ifr = ifrtotal / events.length;
      phist.phy = phytotal / events.length;
      phist.tim = timtotal / events.length;

      phist.ethnicities = ethnicities;

      return phist;  
  }

}

  