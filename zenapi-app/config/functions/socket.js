'use strict';

/*
  Configure & Send custom SocketIO messages

    Message Structure:
    {
      action: "CUSTOM",
      model: "",
      data: {}
    }
*/

var handleCustom = (model, data) => {
  return new Promise((resolve, reject)=>{

    // Getting Model & Data
    console.log('## IO CUSTOM ', model, JSON.stringify(data));

    //TODO: ### Your custom Code Here ###

    resolve(data);
  });
};

// Add your custom SocketIO handlers
var handleRequest = {
  'CUSTOM': handleCustom
};

// check if action and datatype handlers exist
var validMsg = (data) => {
  if(!handleRequest[data.action])
    return false;
  if(!data.model)
    return false;
  if(!data.data)
    return false;

  return true;
};
 
// emit back on the same channel
var send = (socket, msg, code, data) =>{
  socket.emit('MESSAGE',{
    message: msg, 
    code: code,
    data: data
  });
};

module.exports = function (socket) {
  // Run on connection
  // console.log(`Socket connected: ${socket.id}`);
  let newConnection = {
    id: socket.id,
    socket: socket
  }
  zenapi.socketConnections.push(newConnection);

  // Recived Messages
  socket.on('MESSAGE', (data) => {
    console.log('[Message] : ', JSON.stringify(data));

    if(validMsg(data)){
      //console.log(' >> Handeling request');
        
      handleRequest[data.action](data.model, data.data)
        .then((ret) => {
          socket.emit('MESSAGE',ret);
        });
    }
    else{
      send(socket, 'Invalid message structure', 500, null);
    }
  });

  // Check Disconnect
  socket.on('disconnect', () => {
    // console.log(`Socket disconnected: ${socket.id}`);
    for( var i = 0; i < zenapi.socketConnections.length; i++){ 
      if ( zenapi.socketConnections[i].id === socket.id) {
        zenapi.socketConnections.splice(i, 1);
      }
   }
  });
                      
};