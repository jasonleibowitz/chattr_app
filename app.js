var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var redis = require('redis'),
    redisClient = redis.createClient();

server.listen(8080);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

var storeMessage = function(name, data){
  var message = JSON.stringify( {name: name, data: data} );
  redisClient.lpush("messages", message, function(err, message){
    redisClient.ltrim("messages", 0, 10);
  });
};

io.on('connection', function(client){
  client.on('join', function(name){
    client.nickname = name;

    // on join, notify all users that new client joined
    client.broadcast.emit('add chatter', client.nickname);
    redisClient.sadd("chatters", client.nickname);

    redisClient.smembers('chatters', function(err, names){
      names.forEach(function(name){
        client.emit('add chatters', name);
      });
    });

    // send all messsages in DB to new user
    redisClient.lrange("messages", 0, -1, function(err, message){
      messages = message.reverse();
      messages.forEach(function(message){
        message = JSON.parse(message);
        client.emit('chat', message.name + ": " + message.data);
      });
    });
  });

  // server receives messages from client
  client.on('message', function(data){
    // get nickname of client, then broadcast name & message to all connected clients
    console.log(client.nickname + ' says ' + data);
    storeMessage(client.nickname, data);
    io.sockets.emit('chat', client.nickname + ": " + data);
  });

  client.on('disconnect', function(name){
    client.broadcast.emit('remove chatter', client.nickname);
    redisClient.srem('chatters', client.nickname);
  });
});




  // socket.emit('messages', { hello: 'world' });

  // socket.on('my other event', function(data){
  //   console.log(data);
  // });

  // socket.on('messages', function(data){
  //   console.log(data);
  // });
