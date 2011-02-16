var list = document.getElementById("container").getElementsByTagName("ul")[0];
function addToList(hit){
  console.log(hit);
}

var socket = new io.Socket(null, {port: location.port, rememberTransport: false});
socket.on('message', function(messages){
  if('backlog' in messages){
    for(var msg in messages.backlog) addToList(messages.backlog[msg]);
  }else{
    addToList(messages);
  }
});
socket.connect();

