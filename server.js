var http = require('http');
var io = require('socket.io');

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\nApp (netroy) is running..');
});
server.listen(8586);

var socket = io.listen(server);
socket.on('connection', function(client){
  client.broadcast({announcement: client.sessionId + ' connected'});

  client.on('message', function(message){
    var msg = { message: [client.sessionId, message] };
    client.broadcast(msg);
  });

  client.on('disconnect', function(){
    client.broadcast({ announcement: client.sessionId + ' disconnected' })
  });
});
