var http = require('http');
var io = require('socket.io');
var fs = require('fs');
var url = require('url');

var mimeMap = {
  "html":"text/html",
  "css":"text/css",
  "js":"application/javascript"
};

var hitMap = []

var server = http.createServer(function (req, res) {
  var path = url.parse(req.url).pathname;
  if(path === '/') path='/index.html';
  if(path === '/beacon'){
    var hitObj = {
      "ip":req.connection.remoteAddress,
      "referer":req.headers.referer
    };
    hitMap.push(hitObj);

    if(hitMap.length > 10) hitMap.shift();
    res.writeHead(200);
    res.end();
    socket.broadcast(hitObj);
    return;
  }

  fs.readFile(__dirname + path, 'utf8', function(err, data){
    if(err){
      res.writeHead(404);
      res.write('404 - "'+path+'" Not Found');
    }else{
      mime = mimeMap[path.substr(path.lastIndexOf(".")+1)];
      res.writeHead(200, {'Content-Type': (!mime)?'text/plain':mime});
      res.write(data, 'utf8');
    }
    res.end();
  });

});
server.listen(8586);

var socket = io.listen(server);
socket.on('connection', function(client){
  //client.broadcast({announcement: client.sessionId + ' connected'});

  client.on('message', function(message){
    var msg = { message: [client.sessionId, message] };
    client.broadcast(msg);
  });

  client.on('disconnect', function(){
    //client.broadcast({ announcement: client.sessionId + ' disconnected' })
  });
});

