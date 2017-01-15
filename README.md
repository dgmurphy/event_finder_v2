## Synopsis

A Node application for rendering GDELT event data on a Leaflet map using the Google Big Query API. 

## Installation

Install Node Package Manager (npm) and Node.js (v4 or higher) for your OS.

Run npm install in the root of this project.

Create a Google-APIs project (https://console.developers.google.com)

Get a "Service Account Key" for the Google-APIs project from the Credentials page of the Google API Manager.

On the Service Accounts page, use the Create Key option to download a key file.

Copy the service key file to 'big_query_keyfile.json' in the root of this project.

Update the google-cloud require statement in ./lib/mybq.js with your google-cloud project name.


Launch the server:

node app.js

Launch the browser:

http://localhost:3000

## Usage
This app lets the user explore event data sets such as the famous Global Database of Events, Languages and Tone (GDELT). GDELT creates events by collecting news articles from the web, processing them through automated language parsers, and boiling them down into a set of fields. These fields include codes that describe the event action (an 'event code'), who was involved in the event ('actors') and the location and tone of the event. The OE Event Finder app renders these events on a map, shows metrics on the event data, and provides controls for filtering the events. The raw event data can be viewed by selecting the event markers on the map. 

Since 2013 GDEDLT events include a url that links to the original article, but there is no guarantee that the link is still active. 

The U.S. Army uses a list of parameters known as 'PMESII-PT' to help categorize data about a given operational environment. The letters stand for: Political, Military, Economic, Social, Information, Infrastructure, Physical Environment, and Time. Definitions of these parameters is given in the OPFOR Battle Book for the Operational Environment. 

The OE Event Finder includes a crosswalk of GDELT event codes to PMESII-PT variables in order to help the user find events relevant to their OE. This crosswalk is ad-hoc, and can be modified by the user. The table to the right shows the current mapping of the GDELT event codes to PMESII-PT variables.

## Tech
The OE Event Finder uses Node.js and Express.js to create a server, Leaflet.js to render the map, and d3.js to draw the bar chart. The Google Biq Query API is used to fetch new event data sets. At present the event data is limited to the regions defined by the Army's Decisive Action Training Environment (DATE). Making requests for a different region or over the whole globe would just require using a different SELECT statement in the Big Query call, but could easily return more data than can be effectively processed by this app. 

## About
The OE Event Finder project was created for the 'Data Wrangling Bootcamp' class offered by Old Dominion University in Norfolk Virginia, taught by Dr. Charles Cartledge. 

OE Event Finder App by Doug Murphy 
InCadence Strategic Solutions
October, 2016




![Application screen shot.](./oeef.png?raw=true)
