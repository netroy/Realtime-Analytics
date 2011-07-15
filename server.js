if(typeof process.env.IRISCOUCH_CONN_INFO === 'undefined'){
  console.error("need couchdb connection info in IRISCOUCH_CONN_INFO");
  process.exit(-1);
}

var express = require('express'),
        app = module.exports = express.createServer(),
         io = require('socket.io'),
         fs = require('fs'),
        url = require('url'),
      geoip = require('geoip'),
CouchClient = require('couch-client'),
 connection = CouchClient(process.env.IRISCOUCH_CONN_INFO),
      docId = "backlog";

var hits = [];
const MAX_BACKLOG = 200;

// Load Geodata
var geoData = geoip.open(__dirname + '/data/GeoLiteCity.dat');

app.configure(function(){
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// Define the main route
app.get('/', function(req, resp){
  resp.redirect("/index.html");
});

app.get('/beacon', function(req, resp){
  var remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  var city = geoip.City.record_by_addr(geoData,remoteIP);
  if(!!city){
    var hitObj = {
      "ip": remoteIP,
      "loc": {
        "y": city.latitude,
        "x": city.longitude
      },
      "country": city.country_code,
      "city": city.city || "",
      "referer": req.headers.referer,
      "time": (new Date()).getTime()
    };
    hits.push(hitObj);
    if(hits.length > MAX_BACKLOG) hits.shift();
    // broadcast to all connected folks about the new beacon
    io.sockets.json.send(hitObj);
    
    // return blank response for beacon
    resp.writeHead(200, {"Content-type": "text/plain"});
    resp.end(" ");
  }
});

// Catch all route
app.use(function(eq, resp){
  resp.redirect("/");
});

// prevent server from starting as module - can be used with something like multinode
if (!module.parent) {
  app.listen(10872);
  console.info("Started on port %d", app.address().port);
}

// Time to create a websocket listener for the server
io = io.listen(app);
io.set('log level', 1);
io.sockets.on('connection', function(client){
  client.json.send({ "backlog": hits });
});

// fetch the back log to persist data across App restarts
console.info("fetching back log");
connection.get(docId, function(err, doc){
  if(err){
    console.error(err);
    return;
  }else if(doc.hits && doc.hits.length){
    hits = doc.hits;
    console.log("Fetched the backlog. Message count : " + hits.length);
  }
});

// And set a timer to take backups every 60 seconds
var lastTimeStamp = 0, last;
setInterval(function(){
  if(hits.length === 0) return;
  last = hits[hits.length - 1];
  if(last.time <= lastTimeStamp) return;
  connection.save({
    "_id": docId,
    "hits": hits
  }, function(err, doc){
    if(err){
      console.error("Saving failed");
      console.error(err);
      return;
    }
    lastTimeStamp = last.time;
    console.info("Saved the backlog at " + new Date(lastTimeStamp));
  })
},60*1000);
