var http = require('http');
var io = require('socket.io');
var fs = require('fs');
var url = require('url');
var geoip = require('geoip');

var mimeMap = {
  "html":"text/html",
  "css":"text/css",
  "js":"application/javascript",
  "svg":"image/svg+xml",
  "png":"image/png"
};
var hitMap = []
const MAX_BACKLOG = 100;

// Load Geodata
var geoData = geoip.open(__dirname + '/data/GeoLiteCity.dat');

var server = http.createServer(function (req, res) {
  var path = url.parse(req.url).pathname;
  if(path === '/') path='/index.html';

  // Handle the beacon
  if(path === '/beacon'){
    var remoteIP = req.headers['x-forwarded-for']||req.connection.remoteAddress;
    var city = geoip.City.record_by_addr(geoData,remoteIP);

    var hitObj = {
      "ip":remoteIP,
      "referer":req.headers.referer,
      "city":city
    };
    hitMap.push(hitObj);

    // return blank response for beacon
    if(hitMap.length > MAX_BACKLOG) hitMap.shift();
    res.writeHead(200);
    res.end();

    // broadcast to all connected folks about the new beacon
    // hitObj.connection = JSON.stringify(req.headers);
    socket.broadcast(hitObj);
console.log(JSON.stringify(hitObj));
    return;
  }

  // looks like someone requested a file .. serve it if it exists
  var mime = mimeMap[path.substr(path.lastIndexOf(".")+1)];
  var encoding = (!!mime && !!mime.match(/^image\//))?'binary':'utf8';
  fs.readFile(__dirname + path, encoding, function(err, data){
    if(err){
      // looks like file doesn't exist .. 404
      res.writeHead(404);
      res.write('404 - "'+path+'" Not Found');
    }else{
      res.writeHead(200, {'Content-Type': (!mime)?'text/plain':mime});
      res.write(data, encoding);
    }
    res.end();
  });
});
server.listen(8586);

// Time to create a websocket listener for the server
var socket = io.listen(server);
socket.on('connection', function(client){
  client.send({ "backlog": hitMap });
});

