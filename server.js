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
var hits = [];
hits.push({country:"IN",city:"Bangalore",loc:{"y":12.9833,"x":77.5833},referer:'http://netroy.in'});
hits.push({country:"US",city:"Mountain View",loc:{"x":-122.0574,"y":37.4192}});
hits.push({country:"IN",city:"Allahabad",loc:{"x":81.8500,"y":25.4500}});
hits.push({country:"AU",city:"Phillip",loc:{"x":149.1000,"y":-35.3500}});

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
    if(!!city){
      var hitObj = {
        "loc":{y:city.latitude,x:city.longitude},
        "country":city.country_code,
        "referer":req.headers.referer
      };
      hits.push(hitObj);
      if(hits.length > MAX_BACKLOG) hits.shift();
      // broadcast to all connected folks about the new beacon
      socket.broadcast(hitObj);
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
      res.writeHead(200, {'Content-Type': (!mime)?'text/plain':mime,'Content-length': stats.size});
      res.write(data, encoding);
    }
    res.end();
  });
});
server.listen(8586);

// Time to create a websocket listener for the server
var socket = io.listen(server);
socket.on('connection', function(client){
  client.send({ "backlog": hits });
});

