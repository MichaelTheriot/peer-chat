var express = require('express');
var ExpressPeerServer = require('peer').ExpressPeerServer;
var app = express();

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

app.use('/', require('./routes'));

var server = require('http').createServer(app);
var peerServer = ExpressPeerServer(server, {
  debug: true,
  allow_discovery: true
});

peerServer.on('connection', function(id) {
  console.log(id + ' connected');
});

app.use('/peerjs', peerServer);

server.listen(process.env.PORT || 8080);
