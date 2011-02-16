var socket = new io.Socket(null, {port: location.port, rememberTransport: false});
socket.connect();
socket.on("connect",function(){console.log("connected");})
socket.on('message', function(obj){
  console.log(obj);
});

