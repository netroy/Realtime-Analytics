window.requestAnimFrame = (function(w){return w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.mozRequestAnimationFrame || w.oRequestAnimationFrame || w.msRequestAnimationFrame || function(callback, element){ w.setTimeout(callback, 1000 / 60, +new Date); };})(window);

(function(document,undefined){
  var canvas = document.getElementById("monitor");
  var context = canvas.getContext('2d');
  var queue = [];

  //var socket = new io.Socket(null, {port: location.port, rememberTransport: false});
  var socket = new io.connect();
  socket.on('message', function(message){
    if('backlog' in message){
      for(var msg in message.backlog){
        queue.push(message.backlog[msg]);
      }
    }else{
      queue.push(message);
    }
  });

window.ctx = context;
  function ping(x,y){
    context.save();
    var grad = context.createRadialGradient(x,y,0,x,y,5);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.75, 'rgba(60,60,60,0.3)');
    context.fillStyle = grad;
    context.beginPath();
    context.arc(x,y,5,0,Math.PI*2,false);
    context.fill();
    context.restore();
  }

  setInterval(function(){
    if(queue.length == 0) return;
    var hit = queue.shift();
    var x = Math.floor(((hit.loc.x + 170) * 900) / 360);
    var y = Math.floor(((90 - hit.loc.y) * 456) / 180);
    ping(x,y);
  },100);
})(document);
