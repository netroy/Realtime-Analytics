(function(document,undefined){
  var canvas = document.getElementById("monitor");
  var context = canvas.getContext('2d');

  var last = 0;
  function ping(hit){
    context.save();
    if(hit.time < last) return;
    last = hit.time;

    var x = Math.floor(((hit.loc.x + 170) * 900) / 360);
    var y = Math.floor(((90 - hit.loc.y) * 456) / 180);

    var grad = context.createRadialGradient(x,y,0,x,y,5);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(0.75, 'rgba(60,60,60,0.3)');
    context.fillStyle = grad;
    context.beginPath();
    context.arc(x,y,5,0,Math.PI*2,false);
    context.fill();
    context.restore();
  }

  var socket = new io.connect();
  socket.on('message', function(message){
    if('backlog' in message){
      for(var i=0, l=message.backlog.length; i<l; i++){
        ping(message.backlog[i]);
      }
    }else{
      ping(message);
    }
  });
})(document);
