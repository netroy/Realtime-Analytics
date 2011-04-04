(function(document,undefined){
  var canvas = document.getElementById("monitor");
  var context = canvas.getContext('2d');
  var queue = [];

  var socket = new io.Socket(null, {port: location.port, rememberTransport: false});
  socket.on('message', function(message){
    if('backlog' in message){
      for(var msg in message.backlog){
        queue.push(message.backlog[msg]);
      }
    }else{
      queue.push(message);
    }
  });
  socket.connect();

  setInterval(function(){
    if(queue.length == 0) return;
    var hit = queue.shift();
    console.log(hit);
  },200);
})(document);
