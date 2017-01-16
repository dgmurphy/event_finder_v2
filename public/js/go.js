var mapGlobal;
var circlesArr = [];
var eventDetailsArr = [];

$(document).ready(function () {

    // --------- .startsWith polyfill -----------
    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
      };
    }   


   var mymap = L.map('leafletmap').setView([40.518538, 44.704814], 4);
   L.tileLayer('https://api.mapbox.com/styles/v1/dgmurphy/citrgk3hm00122il4ma9gy29r/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGdtdXJwaHkiLCJhIjoiY2l0cTM4NTI2MDBiZjJvbXN6ZWZxMzQ4NSJ9.0cshlThPWiLeJYgcWGQXCg', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    }).addTo(mymap);

   mapGlobal = mymap;

    // Load Data set
    $("#loadDataBtn").on('click', function () {

        var selectedDataFile = $("#dataSelect").val();

        disableButton("loadDataBtn");

        clearMap();

        $.post('/bqgdeltmock', {datafile: selectedDataFile}, printResponse);

    });

    // Big Query API call
    $("#bqApiForm").submit(function (e) {
        e.preventDefault();

        var keyword = $("#unlockinput").val();
        if ( (keyword == "pass-key") || (keyword.length < 4) ) {
            $("#bqgdeltbtn").text("Wrong Key");
        } else {

            disableButton("bqgdeltbtn");

            clearMap();

            var dayval = $("[name='dayinput']").val();
            var monthval = $("[name='monthselect']").val();
            var yearval = $("[name='yearselect']").val();
            var limitval = $("[name='eventlimit']").val();

            //Failsafe for limitval
            var flimit = parseInt(limitval);
            if ( (Number.isNaN(flimit)) || (flimit > 1000) )
                flimit = "1000";
            else
                flimit = limitval;

            $.post('/bqgdelt', {day: dayval, month: monthval, year: yearval, 
                                limit: flimit, key: keyword}, printResponse);
        }
    });

    // Clear the map
    $("#clearMapBtn").on('click', function() {
        
        clearMap();
        $('#resultsText').html("<strong>Results: </strong>Empty map.");
        
    });

    // Validate day input
    $("#dayinput").focusout(function() {
        validateDay();
    });


    $("#resetFiltersBtn").on('click', function() {
        resetFilters();
        filterEvents();
    });

    $("#applyFiltersBtn").on('click', function() {
        filterEvents();
    });

    $("#applyScaleBtn").on('click', function() {
        changeMarkerScale();
    });

    $("#gsRadio").bind('change', function() {
        changeMarkerData();
    });

    $("#toneRadio").bind('change', function() {
        changeMarkerData();
    });

    // Tooltips
    $( document ).tooltip();

    var tip = "Each circle is one GDELT action location.<br>" +
              " <span style = 'color:red'>Red</span> = negative tone, <br>" +
              " <span style = 'color:blue'>Blue</span> = positive tone, <br> " +
              " Size is proportional to tone magnitude.";
    $("#legendIcon").tooltip({
        content: tip
    });


    // TODO: Validate Date Inputs

    initPage();


});  // End document ready

function initPage() {
    //$("#bqgdeltmockbtn").prop("disabled",true);
    //$("#mockspin").css("display", "inline-block");

    initPmequalizer();

    clearMap();

    var initFile = $("#dataSelect").val();

    $.post('/bqgdeltmock', {datafile: initFile}, printResponse);
}


function disableButton(id) {
    var btn = $("#"+id);
    btn.prop("disabled", true);
    btn.html("<img height=14px src='css/spin.gif'/>")
}

function enableButton(id, text) {
    var btn = $("#"+id);
    btn.prop("disabled", false);
    btn.html(text);
}

//      ---------- PMEQUALIZER ---------------------------
function initPmequalizer() {

     // PMESII Filters
     var initVal = 0;

     $( "#eq > span" ).each(function() {
      var sliderId = $(this).attr('id');
      var limitId = "l" + sliderId.substring(1,4);
      $( this ).empty().slider({
        value: initVal,
        range: "min",
        animate: true,
        orientation: "vertical",
        min: 0,
        max: 4,
        step: 1,
        slide: function( event, ui ) {
            $( "#" + limitId ).text( ui.value );
        }
      });

      $( "#" + limitId ).text(initVal);

    }); 

     // Tone Filter
     $("#toneSlider").slider({
        range: "min",
        value: 0,
        min: 0,
        max: 10,
        slide: function(event,ui) {
            $("#toneVal").text(ui.value);
        }
     });

     // Scale slider
     $("#scaleSlider").slider({
        value: 16000,
        min: 500,
        max: 30000
     });
}

function validateDay() {
    var dayint = parseInt($("#dayinput").val());
    if (dayint > 31) {
        $("#dayinput").val("31"); 
    }
}


function enableForms() {

    enableButton("bqgdeltbtn", "Submit Big Query");
    enableButton("loadDataBtn", "Load Data");
    
}


function updateFilterPresets(data) {

    // Set the slider positions and slider readouts
    for (var key in data.phist) {
        var setval = Math.floor(data.phist[key]);
        var sliderId = "e" + key;
        $("#" + sliderId).slider( "option", "value", setval);
        var limitId = "l" + key;
        $( "#" + limitId ).text(setval);
    }

}

function printResponse(resp) {

    if (resp == "bad key") {
        $("#bqgdeltbtn").prop("disabled", false);
        $("#bqgdeltbtn").css("background-color", "red");
        $("#bqgdeltbtn").html("invalid key");
        return;
    }

    if (resp == "bqerror") {
        $("#bqgdeltbtn").prop("disabled", false);
        $("#bqgdeltbtn").css("background-color", "red");
        $("#bqgdeltbtn").html("OVER QUOTA");
        return;
    }

    if (resp.toString().toLowerCase().startsWith("error")) {
        var msg = "  Try clearing the cache and reloading. Don't forget to send Doug some hatemail also.";
        alert(resp + msg);
        return;
    }

    drawDots(resp.events);

    $('#resultsText').html("<strong>Results: </strong>" + resp.status);

    barChart(resp.phist);

    enableForms();
}


function drawDots (pointsArray) {

    var skippedEvents = 0;
    var eventsDrawn = 0;

    pointsArray.forEach(function (point) {

        //Only render if we have location and tone and goldstein data
        if ( (point.lat) && (point.long) && (point.tone) && (point.goldstein) ) {
            makeDot(point);
            ++eventsDrawn;
        }
        else {
            ++skippedEvents;
        }
        
    });

    console.log("Skipped " + skippedEvents + " events with incomplete data.\n");
    $("#eventCount").html("<strong>Markers&nbsp;drawn:</strong>&nbsp;" + eventsDrawn);
}

function makeDot(point) {

    // Are we drawing tone or Golstein Scale?
    var usingGS =  $('#gsRadio').is(':checked');

    if (usingGS) {

        dotColor = getDotColor(point.goldstein, 'goldstein');
        dotSize = getDotSize(point.goldstein);

    } else {

        dotColor = getDotColor(point.tone, 'tone');
        dotSize = getDotSize(point.tone);
    }

    var circle = L.circle([point.lat, point.long], {
        color: dotColor,
        stroke: false,
        fillColor: dotColor,
        fillOpacity: 0.1,
        radius: dotSize,
        tone: point.tone,
        pmesiiScore: point.pmesiiscore,
        visible: true,
        globaleventid: point.globaleventid,
        sourcefile: point.sourcefile,
        goldstein: point.goldstein,
        eth1: point.eth1,
        eth2: point.eth2,
        rel1: point.rel1,
        rel2: point.rel2
    }).addTo(mapGlobal);



    circle.on('click', function(me){
        circleClicked(me);
    });

    circlesArr.push(circle);

}

function getDotColor(metric, type) {

    var color ="black";
    if (metric == 0) 
        return color;

    if (type == "tone") {
        color = "blue";
        if(metric < 0.0) {
            color = "red";
        }
    } else {  // goldstein
        color = "green";
        if(metric < 0.0) {
            color = "orange";
        }       
    }

    return color;
}

function getDotSize(metric) {


    var toneMag = Math.abs(metric);

    //GDLET: Tone magnitude can vary from 0 100 but 0 to 10 is common
    // So clamp it from 1 to 10
    if(toneMag > 10.0) {
        toneMag = 10.0;
    } 
    else if (toneMag < 0.5) {
        toneMag = 1.0;
    }

    // Convert to meters
    var dotScale = $( "#scaleSlider" ).slider( "option", "value" );
    var dotSize = dotScale * toneMag;
    if (dotSize < 500)
        dotSize = 500;

    return dotSize;
}


function clearMap() {

    circlesArr = new Array();
    $('#resultsText').html("<strong>Results: </strong>Updating...");
    //$('#legend').css("display", "none");

    for(i in mapGlobal._layers) {
        if(mapGlobal._layers[i]._path != undefined) {
            try {
                mapGlobal.removeLayer(mapGlobal._layers[i]);
            }
            catch(e) {
                console.log("problem with " + e + mapGlobal._layers[i]);
            }
        }
    }

    resetFilters();

    $("#eventCount").html("<strong>Markers&nbsp;drawn:</strong>&nbsp;0");
}

// ----------------- Filters ----------------------------------------

function resetFilters() {

    var zeros = {
        pol: 0, mil: 0, eco: 0, soc: 0, inf: 0, ifr: 0, phy: 0, tim: 0
    };

    // Set the pmesii slider positions and slider readouts back to zero
    for (var key in zeros) {
        var sliderId = "e" + key;
        $("#" + sliderId).slider( "option", "value", 0);
        var limitId = "l" + key;
        $( "#" + limitId ).text("0");
    }

    //tone
    $( "#toneSlider" ).slider( "option", "value", 0 );
    $("#toneVal").text(0);

    // tone sign
    $("#tpos").prop("checked", true);
    $("#tneg").prop("checked", true);

    //filterEvents();
}


function filterEvents() {

    var pmesiiFilter = [
        parseInt($("#lpol").text()),
        parseInt($("#lmil").text()),
        parseInt($("#leco").text()),
        parseInt($("#lsoc").text()),
        parseInt($("#linf").text()),
        parseInt($("#lifr").text()),
        parseInt($("#lphy").text()),
        parseInt($("#ltim").text()),
    ];

    var numVisible = 0;
    var showPos = $("#tpos").prop("checked");
    var showNeg = $("#tneg").prop("checked");

    for(var i=0; i < circlesArr.length; ++i) {

        c = circlesArr[i];
        var turnOn = true;

        // PMESII High-Pass Filter
        for (var j=0; j < pmesiiFilter.length; j++) {

            var score = parseInt(c.options.pmesiiScore.charAt(j));
            if (score < pmesiiFilter[j]) {
                turnOn = false;
                if (c.options.visible) {
                    mapGlobal.removeLayer(circlesArr[i]);
                    c.options.visible = false;
                }

            }
 
        }

        // Tone mag filter
        var toneVal = parseFloat( $( "#toneSlider" ).slider( "option", "value" ));
        if (Math.abs(c.options.tone) < toneVal) {
            turnOn = false;
            if (c.options.visible) {
                mapGlobal.removeLayer(circlesArr[i]);
                c.options.visible = false;
            }
        }


        // -------  Tone sign filter -----------
        var tsVal = 0;
        if ( $('#toneRadio').is(':checked'))
            tsVal = c.options.tone;
        else
            tsVal = c.options.goldstein;

        
        if ( (tsVal < 0) && !showNeg )  {
            turnOn = false;
            if (c.options.visible) {
                mapGlobal.removeLayer(circlesArr[i]);
                c.options.visible = false;
            }
        } 

        if ( (tsVal > 0) && !showPos )  {
            turnOn = false;
            if (c.options.visible) {
                mapGlobal.removeLayer(circlesArr[i]);
                c.options.visible = false;
            }
        } 
        // -- end tone sign filter 
      


        if ( !c.options.visible && turnOn ) {
            c.addTo(mapGlobal);
            c.options.visible = true;
        }
         
        if (c.options.visible)
            ++ numVisible;   
    }
     
     updateBarChart();

     // Update event count
     $("#eventCount").html("<Strong>Markers&nbsp;drawn:&nbsp;</strong>" + numVisible);

}



function changeMarkerScale() {

    //erase all the existing circles
    for(i in mapGlobal._layers) {
        if(mapGlobal._layers[i]._path != undefined) {
            try {
                mapGlobal.removeLayer(mapGlobal._layers[i]);
            }
            catch(e) {
                console.log("problem with " + e + mapGlobal._layers[i]);
            }
        }
    };
    
    // draw visible circles with new scale
    for (var j = 0; j < circlesArr.length; ++j) {
        var newRad = getDotSize(circlesArr[j].options.tone);
        circlesArr[j].setRadius(newRad);
        if (circlesArr[j].options.visible) 
            circlesArr[j].addTo(mapGlobal);
    };
    
}

// ----------------------------------   Charts -------------------------
function updateEthnicities (ethnicities, ethnicity) {

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



function updateReligions (religions, religion) {

    if (!religion)
        return religions;

    var found = false;
    religions.forEach(function (rel) {
        if (rel.name == religion) {
            rel.count++;
            found = true;
        }    
    });
    if (!found) {
      var rel = {};
      rel.name = religion;
      rel.count = 1;
      religions.push(rel);
    }

    return religions;
}

function updateBarChart() {

    var numVisibleCircles = 0;

    var poltotal = 0, miltotal = 0, ecototal = 0, soctotal = 0, 
        inftotal = 0, ifrtotal = 0, phytotal = 0, timtotal = 0.0;

    var phist = { pol: 0.0, mil: 0.0, eco: 0.0, soc: 0.0, inf: 0.0,
                  ifr: 0.0, phy: 0.0, tim: 0.0 };

    var ethnicities = [];
    var religions = [];

    for (var i=0; i < circlesArr.length; ++i) {

        c = circlesArr[i];
        if (c.options.visible) {

            ++numVisibleCircles;
            var score = c.options.pmesiiScore;

            poltotal += parseFloat(score.charAt(0));
            miltotal += parseFloat(score.charAt(1));
            ecototal += parseFloat(score.charAt(2));
            soctotal += parseFloat(score.charAt(3));
            inftotal += parseFloat(score.charAt(4));
            ifrtotal += parseFloat(score.charAt(5));
            phytotal += parseFloat(score.charAt(6));
            timtotal += parseFloat(score.charAt(7));

            ethnicities = updateEthnicities(ethnicities, c.options.eth1);
            ethnicities = updateEthnicities(ethnicities, c.options.eth2);

            religions = updateReligions(religions, c.options.rel1);
            religions = updateReligions(religions, c.options.rel2);

        }

    }

    if (numVisibleCircles > 0) {
        phist.pol = poltotal / numVisibleCircles;
        phist.mil = miltotal / numVisibleCircles;
        phist.eco = ecototal / numVisibleCircles;
        phist.soc = soctotal / numVisibleCircles;
        phist.inf = inftotal / numVisibleCircles;
        phist.ifr = ifrtotal / numVisibleCircles;
        phist.phy = phytotal / numVisibleCircles;
        phist.tim = timtotal / numVisibleCircles;
    }

    phist.ethnicities = ethnicities;
    phist.religions = religions;

    barChart(phist);

}


function religionChart(religions) {

    religions.sort(function(a, b) {
        return b.count - a.count;
    });

    // Top three religions plus other
    var topRels = [];
    var len = religions.length > 2 ? 3 : religions.length;
    for (i = 0; i < len; i++) {
        topRels.push(religions[i]);
    }

    var otherRels = {};
    otherRels.name = "other";
    otherRels.count = 0;
    for (i = 3; i < religions.length; i++) {
        otherRels.count += religions[i].count;
    }

    if (religions.length > 4)
        topRels.push(otherRels);
    else if (religions.length == 4)
        topRels.push(religions[3]);

    $("#relsTable").html("");

    var tableHtml = "<tr><td colspan='2'><strong>" + religions.length + " Different Religions</strong></td></tr>";
    tableHtml += "<tr><td><table id='relDetails'>";

    for(i = 0; i < topRels.length; i++) {

        rel = topRels[i];
        var color = getColorForCode("rel", i);

        tableHtml += "<tr>";
        tableHtml += "<td>";
        tableHtml += "<div class='colorbox' style='background-color:" + color + "'></div>"
        tableHtml += "</td>";
        tableHtml += "<td class='ethcol1'>" + rel.name + "</td>";
        tableHtml += "<td>" + rel.count + "</td>";
        tableHtml += "</tr>";

    };  

    tableHtml += "</tr></table>";

    tableHtml += "</td><td><div id='relPie'> </div></td></tr></table>";
    $("#relsTable").append(tableHtml);

    makePie(topRels, "#relPie");
}

// TODO Combine with makeEthPie and pass in the div id
function makePie(top, element) {


    var data = [];
    top.forEach(function(e) {
        data.push(e.count);
    });

    var width = 90,
        height = 90,
        radius = Math.min(width, height) / 2;

    var color = function(index) {

        if (element == "#relPie")
            return getColorForCode("rel", index);
        else
            return getColorForCode("eth", index);
    }

    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var labelArc = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    var pie = d3.pie()
        .sort(null)
        .value(function(d) { return d; });

    var svg = d3.select(element).append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var g = svg.selectAll(".arc")
        .data(pie(data))
        .enter().append("g")
        .attr("class", "arc")
        .on("mouseover", function (d) {
            d3.select("#tooltip")
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY + "px")
            .style("opacity", 1)
            .select("#value")
            .text(top[d.index].name);   
        })
        .on("mouseout", function () {
            d3.select("#tooltip")
                .style("opacity", 0);

        });

    g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { return color(d.index); });

}



function ethnicityChart(ethnicities) {

    ethnicities.sort(function(a, b) {
        return b.count - a.count;
    });
    
    // Top three ethnicities plus other
    var topEths = [];
    var len = ethnicities.length > 2 ? 3 : ethnicities.length;
    for (i = 0; i < len; i++) {
        topEths.push(ethnicities[i]);
    }

    var otherEths = {};
    otherEths.name = "other";  // more than one ethnicity was combined
    otherEths.count = 0;
    for (i = 3; i < ethnicities.length; i++) {
        otherEths.count += ethnicities[i].count;
    }
    
    if (ethnicities.length > 4)
        topEths.push(otherEths);
    else if (ethnicities.length == 4)
        topEths.push(ethnicities[3]);

    $("#ethsTable").html("");

    var tableHtml = "<tr><td colspan='2'><strong>" + ethnicities.length + " Different Ethnicities</strong></td></tr>";
    tableHtml += "<tr><td><table id='ethDetails'>";


    for(i = 0; i < topEths.length; i++) {

        eth = topEths[i];

        var color = getColorForCode("eth", i);

        tableHtml += "<tr>";
        tableHtml += "<td>";
        tableHtml += "<div class='colorbox' style='background-color:" + color + "'></div>"
        tableHtml += "</td>";
        tableHtml += "<td class='ethcol1'>" + eth.name + "</td>";
        tableHtml += "<td>" + eth.count + "</td>";
        tableHtml += "</tr>";

    };   

    tableHtml += "</tr></table>";

    tableHtml += "</td><td><div id='ethPie'> </div></td></tr></table>";
    $("#ethsTable").append(tableHtml);

    makePie(topEths, "#ethPie");
}


function getColorForCode(code, pos) {

/*
    lccode = code.toLowerCase();
    var red = lccode.charCodeAt(0) - 97;
    red = Math.floor(red / 26.0 * 255.0);

    var green = lccode.charCodeAt(1) - 97;
    green = Math.floor(green / 26.0 * 255.0);

    var blue = lccode.charCodeAt(2) - 97;
    blue = Math.floor(blue / 26.0 * 255.0);

    var color = "rgb(" + red + "," + green + "," + blue + ")";
*/

    switch(code) {

        case "eth":
            if (pos == 0)
                color = "#A0BED2";
            else if (pos == 1)
                color = "#A5D2A0";
            else if (pos == 2)
                color = "#D2B4A0";
            else
                color = "lightgrey";
        break;

        case "rel":
            if (pos == 0)
                color = "#A18BCB";
            else if (pos == 1)
                color = "#CB8B95";
            else if (pos == 2)
                color = "#CBC18B";
            else
                color = "lightgrey";
        break;


    }

 

    return color;
}


function barChart(jsondata) {

    ethnicityChart(jsondata["ethnicities"]);
    religionChart(jsondata["religions"]);

    $("#d3chart").html("");

    // This is the format that d3 chart is looking for
    var data = [
        {"pname" : "Pol", "pscore" : parseFloat(jsondata["pol"])},
        {"pname" : "Mil", "pscore" : parseFloat(jsondata["mil"])},
        {"pname" : "Econ", "pscore" : parseFloat(jsondata["eco"])},
        {"pname" : "Soc", "pscore" : parseFloat(jsondata["soc"])},
        {"pname" : "Info", "pscore" : parseFloat(jsondata["inf"])},
        {"pname" : "Infra", "pscore" : parseFloat(jsondata["ifr"])},
        {"pname" : "Phys", "pscore" : parseFloat(jsondata["phy"])},
        {"pname" : "Time", "pscore" : parseFloat(jsondata["tim"])},
    ];


// set the dimensions and margins of the graph
var margin = {top: 10, right: 20, bottom: 20, left: 30},
    width = 276 - margin.left - margin.right,
    height = 90 - margin.top - margin.bottom;

// set the ranges
var x = d3.scaleBand()
          .range([0, width])
          .padding(0.1);
var y = d3.scaleLinear()
          .range([height, 0]);


// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg = d3.select("#d3chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", 
          "translate(" + margin.left + "," + margin.top + ")");


  // format the data
  data.forEach(function(d) {
    d.pscore = +d.pscore;
  });


// Scale the range of the data in the domains
  x.domain(data.map(function(d) { return d.pname; }));
  y.domain([0, d3.max(data, function(d) { return d.pscore; })]);


// Define the div for the tooltip
var div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);


  // append the rectangles for the bar chart
  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.pname); })
      .attr("width", x.bandwidth())
      .attr("y", function(d) { return y(d.pscore); })
      .attr("height", function(d) { return height - y(d.pscore); })
      .on('mouseover', function(d) {
            div.transition()        
                .duration(200)      
                .style("opacity", .9);      
            div .html(d3.format(".3f")(d.pscore))  
                .style("left", (d3.event.pageX) + "px")     
                .style("top", (d3.event.pageY - 28) + "px");
            })
      .on('mouseout', function(d) {
            div.transition()     
                .duration(500)      
                .style("opacity", 0);
            });

   // add the x Axis
  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));
      
  // add the y AxisQ
  svg.append("g")
      .call(d3.axisLeft(y).ticks(4)); 

}

function circleClicked(me) {

    
    var selectedEvents = [];
    
    mapGlobal.eachLayer(function(layer) {
        if(layer instanceof L.Circle)
            if( getDistance(me.latlng, layer.getLatLng()) < layer.getRadius()) {
                
                selectedEvents.push(layer);
            }
    });

    renderSelectedEvents(selectedEvents);
    
}

function getDistance(p1, p2) {

    return p1.distanceTo(p2);
}

function renderSelectedEvents(events) {

    var eventsJson = makeEventsJson(events);
    $.post('/eventdetails', {events: JSON.stringify(eventsJson)}, getEventDetails);
 
}



function makeEventsJson(eventsArr) {

    var eventsJson = [];

    for(var i=0; i < eventsArr.length; ++i) {

        var eventj = {};
        c = eventsArr[i];
        eventj.globaleventid = c.options.globaleventid;
        eventj.sourcefile = c.options.sourcefile;
        
        eventsJson.push(eventj);

    }

    return eventsJson;

}

/* -------------------- EVENT DETAILS TABLE ----------------------- */

function getDescFromCameoCode(el) {

    var cameoCode = el.innerHTML;

    $.ajax({
      url: "/cameocode",
      type: "POST", 
      //dataType:"json",
      data:{ ccode: cameoCode },
      success: function(response) {
        var codespan = "<span style='color:gray; font-size:.85em; margin-left:8px;'>[" +
                       cameoCode + "]</span>";
       $(el).html(response + codespan);
      },
      error: function(xhr) {
       $(el).html("No CAMEO description available for code: " + cameoCode);
       console.log("Error", arguments);
      }
    });

}

function hasURL(evArr, evurl) {

    var hasURL = false;

    evArr.forEach( function(ev) {
        if (ev.url == evurl) {
            hasURL = true;
        }
    });

    return hasURL;
}

function getEventDetails (resp) {

    if (resp.toString().toLowerCase().startsWith("error")) {
        console.log("Error getting event details");
        alert("Error getting event details. Try clearing the cache and reloading the page.");
        return;
    }

    eventDetailsArr = resp;

    $("#eventsTable").html("");
    
    // event summary for table display
    var evArr = [];
    
    resp.forEach(function(rev){
        var ev = {};

        ev.id = rev.GLOBALEVENTID;
        ev.url = rev.SOURCEURL;
        ev.ccode = rev.EventCode;

        ev.actor1 = rev.Actor1Name != null ? rev.Actor1Name : "";
        if (rev.Actor1Type1Code != null)
            ev.actor1 += "." + rev.Actor1Type1Code;
        if (rev.Actor1Type2Code != null)
            ev.actor1 += "." + rev.Actor1Type2Code;
        if (rev.Actor1Type3Code != null)
            ev.actor1 += "." + rev.Actor1Type3Code;

        ev.actor2 = rev.Actor2Name != null ? rev.Actor2Name : "";
        if (rev.Actor2Type1Code != null)
            ev.actor2 += "." + rev.Actor2Type1Code;
        if (rev.Actor2Type2Code != null)
            ev.actor2 += "." + rev.Actor2Type2Code;
        if (rev.Actor2Type3Code != null)
            ev.actor2 += "." + rev.Actor2Type3Code;

        ev.tone = parseFloat(rev.AvgTone).toFixed(3);
        ev.goldstein = parseFloat(rev.GoldsteinScale).toFixed(3);

        // only add unique URLs
        if ( !hasURL(evArr, ev.url))
            evArr.push(ev);


    });


    // Header row
    var tableHeader = "<tr>" +
                            "<th>Info</th>" +
                            "<th>Link</th>" +
                            "<th class='descriptioncode'>Description (code)</th>" +
                            "<th>Actor&nbsp;1</th>" +
                            "<th>Actor&nbsp;2</th>" +
                            "<th>Tone</th>" +
                            "<th>G.S.</th>" +
                        "</tr>";

    $("#eventsTable").append(tableHeader);

    // Events rows
    evArr.forEach(function(evt) {

        var trow = "<tr>";

        trow += "<td>";
        trow += "<a href='#' onclick='return false' class='infolink gid_" + evt.id + "'>";
        trow += "<svg class='icon icon-info'><use xlink:href='#icon-info'></use></svg>";
        trow += "</a>";
        trow += "</td>";

        trow += "<td>";
        trow += "<a target='_blank' href='" + evt.url + "'>";
        trow += "<svg class='icon icon-link'><use xlink:href='#icon-link'></use></svg>";
        trow += "</a>";
        trow += "</td>";
                        
        trow += "<td class='cameo'>" + evt.ccode + "</td>";
        trow += "<td>" + evt.actor1 + "</td>";
        trow += "<td>" + evt.actor2 + "</td>";
        trow += "<td>" + evt.tone + "</td>";
        trow += "<td>" + evt.goldstein + "</td>";
        trow += "</tr>";

        $("#eventsTable tr:last").after(trow);
    });

    // Convert the codes to descriptions
    $(".cameo").each(function(i, obj) {
        getDescFromCameoCode(obj);
    });

    // Set the events on the info icons
    $(".infolink").on('click', function(e) {
        showDetailsModal(e);
    });
        
    // Update the legend
    var dups = resp.length - evArr.length;
    var showing = "Showing " + evArr.length + " event summaries (found " +
                  resp.length + " events and removed " + dups +
                  " with duplicate urls.)";

    $("#eventDetails").text(showing);
}

function showDetailsModal(e) {
    
    // Get the global event id from the classname
    var globalid = "none";
    var el = $(e.currentTarget).attr('class');
    var classList = el.split(/\s+/);

    $.each(classList, function(index, item) {
        if (item.startsWith("gid_"))
            globalid = item.replace("gid_", "");
    });


    // Get the event details
    //var fullEventData = "FULL EVENT DATA";
    var fullEventData = getFullEvent(globalid);
    var ccode = fullEventData.EventCode;
    var fullEventDataJson = JSON.stringify(fullEventData);

    $.ajax({
      url: "/evhtml",
      type: "POST", 
      data:{ event: fullEventDataJson },
      success: function(html) {
        showEventModal(html, ccode);
      },
      error: function(xhr) {
       console.log("Error", arguments);
      }
    });

}

function getFullEvent(gid) {

    var fullEvent = {err: "Event Data Not Found"};

    for(var i = 0; i < eventDetailsArr.length; ++i) {

        ev = eventDetailsArr[i];
        if (ev.GLOBALEVENTID == gid) {
            fullEvent = ev;
            break;
        }
    }

    return fullEvent;
}

function showEventModal(html, ccode) {

    $("#eventModal").css("display", "block");
    $("#eventHtml").html(html);

    $(".modal-content .close").on("click", function() {
        $("#eventModal").css("display", "none");
    });
    $(document).on("click", function(event) {
        if ($(event.target).attr("class") == "modal")
             $("#eventModal").css("display", "none");
    });

    // Show the PMESII Score
    $.ajax({
      url: "/pmesiiscore?ccode=" + ccode,
      success: function(pscore) {
        var pmesiiscore = "Pol: " + pscore.charAt(0) + "&nbsp;&nbsp;" +
                          "Mil: " + pscore.charAt(1) + "&nbsp;&nbsp;" +
                          "Econ: " + pscore.charAt(2) + "&nbsp;&nbsp;" +
                          "Soc: " + pscore.charAt(3) + "&nbsp;&nbsp;" +
                          "Info: " + pscore.charAt(4) + "&nbsp;&nbsp;" +
                          "Infra: " + pscore.charAt(5) + "&nbsp;&nbsp;-&nbsp;&nbsp;" +
                          "Phys: " + pscore.charAt(6) + "&nbsp;&nbsp;" +
                          "Time: " + pscore.charAt(7);
        $("#pmesiiScore").html(pmesiiscore);
      },
      error: function(xhr) {
       console.log("Error", arguments);
      }
    });


}

function changeMarkerData() {

    //var mdata = $('input[name=markerdata]:checked', '#markerDataForm').val()
     var usingGS =  $('#gsRadio').is(':checked');

    if (usingGS) {
        $("#toneLabel").html("G.S. mag:&nbsp;&nbsp;");
        $("#toneSignLabel").html("G.S. sign&nbsp;&nbsp;");
        redrawUsingGoldstein();
    } else {
        $("#toneLabel").html("Tone mag:");
        $("#toneSignLabel").html("Tone sign"); 
        redrawUsingTone();
    }

    
}

function redrawUsingGoldstein() {

    // draw visible circles with new color and scale
    for (var j = 0; j < circlesArr.length; ++j) {

        var gs = circlesArr[j].options.goldstein;

        var newRad = getDotSize(gs);
        circlesArr[j].setRadius(newRad);

        var newColor = getDotColor(gs, 'goldstein')
        circlesArr[j].setStyle({fillColor : newColor}); 

    }

}


function redrawUsingTone() {

    // draw visible circles with new color and scale
    for (var j = 0; j < circlesArr.length; ++j) {

        var tone = circlesArr[j].options.tone;

        var newRad = getDotSize(tone);
        circlesArr[j].setRadius(newRad);

        var newColor = getDotColor(tone, 'tone')
        circlesArr[j].setStyle({fillColor : newColor}); 

    }

}