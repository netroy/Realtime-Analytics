var    http = require('http'),
         io = require('socket.io'),
         fs = require('fs'),
        url = require('url'),
      geoip = require('geoip'),
CouchClient = require('couch-client'),
 connection = CouchClient("http://analytics:realtimeAnalytics@netroy.iriscouch.com/analytics"),
      docId = "backlog";

var mimeMap = {
  "html":"text/html",
  "css":"text/css",
  "js":"application/javascript",
  "svg":"image/svg+xml",
  "png":"image/png"
};
var hits = [];
const MAX_BACKLOG = 200;

// Load Geodata
var geoData = geoip.open(__dirname + '/data/GeoLiteCity.dat');

var server = http.createServer(function (req, res) {
  var path = url.parse(req.url).pathname;
  if(path === '/') path='/index.html';

  // Handle the beacon
  if(path === '/beacon'){
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
    }
    // return blank response for beacon
    res.writeHead(200);
    res.end();
    return;
  }

  // looks like someone requested a file .. serve it if it exists
  var mime = mimeMap[path.substr(path.lastIndexOf(".")+1)];
  var encoding = (!!mime && !!mime.match(/^image\//))?'binary':'utf8';
  var file = __dirname + path;
  fs.readFile(file, encoding, function(err, data){
    if(err){
      // looks like file doesn't exist .. 404
      res.writeHead(404);
      res.write('404 - "'+path+'" Not Found');
    }else{
      var stats = fs.statSync(file);
      res.writeHead(200, {'Content-Type': (!mime)?'text/plain':mime,'Content-length': stats.size, 'Cache-Control': 'max-age=157852800000'});
      res.write(data, encoding);
    }
    res.end();
  });
});
server.listen(8586);

// Time to create a websocket listener for the server
io = io.listen(server);
io.set('log level', 0);
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