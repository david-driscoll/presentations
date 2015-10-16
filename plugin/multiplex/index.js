var express		= require('express');
var fs			= require('fs');
var io			= require('socket.io');
var crypto		= require('crypto');
var stream      = require('stream');
var Mustache  = require('mustache');

var app			= express.createServer();
var staticDir	= express.static;

io				= io.listen(app);

var opts = {
	port: process.env.PORT || 1948,
	baseDir : __dirname + '/../../'
};

io.sockets.on('connection', function(socket) {
	socket.on('slidechanged', function(slideData) {
		if (typeof slideData.secret == 'undefined' || slideData.secret == null || slideData.secret === '') return;
		if (createHash(slideData.secret) === slideData.socketId) {
			slideData.secret = null;
			socket.broadcast.emit(slideData.socketId, slideData);
		};
	});

	socket.on( 'connect', function( data ) {
		socket.broadcast.emit( 'connect', data );
	});

	socket.on( 'statechanged', function( data ) {
		socket.broadcast.emit( 'statechanged', data );
	});
});

app.configure(function() {
	[ 'css', 'js', 'plugin', 'lib', 'img' ].forEach(function(dir) {
		app.use('/' + dir, staticDir(opts.baseDir + dir));
	});
});

app.get("/", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	fs.createReadStream(opts.baseDir + '/index.html').pipe(res);
});

var clientHtml = undefined;
app.get("/client", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});

	if (!clientHtml) {
		clientHtml = fs.readFileSync(opts.baseDir + '/index.html').toString();
		clientHtml = clientHtml.replace("'14419322957904076034'", "null");
		clientHtml = clientHtml.replace("{ src: 'plugin/notes-server/client.js', async: true }", "");
		//clientHtml = clientHtml.replace('plugin/multiplex/master.js', 'plugin/multiplex/client.js');
	}

	var s = new stream.Readable();
	s._read = function noop() {}; // redundant? see update below
	s.push(clientHtml);
	s.push(null);

	s.pipe(res);
	//fs.createReadStream(opts.baseDir + '/index.html').pipe(res);
});

app.get("/token", function(req,res) {
	var ts = new Date().getTime();
	var rand = Math.floor(Math.random()*9999999);
	var secret = ts.toString() + rand.toString();
	res.send({secret: secret, socketId: createHash(secret)});
});

app.get( '/notes/:socketId', function( req, res ) {

	fs.readFile( opts.baseDir + 'plugin/notes-server/notes.html', function( err, data ) {
		res.send( Mustache.to_html( data.toString(), {
			socketId : req.params.socketId
		}));
	});

});

app.get( '/phone/:socketId', function( req, res ) {

	fs.readFile( opts.baseDir + 'plugin/notes-server/phone.html', function( err, data ) {
		res.send( Mustache.to_html( data.toString(), {
			socketId : req.params.socketId
		}));
	});

});

var createHash = function(secret) {
	var cipher = crypto.createCipher('blowfish', secret);
	return(cipher.final('hex'));
};

// Actually listen
app.listen(opts.port || null);

var brown = '\033[33m',
	green = '\033[32m',
	reset = '\033[0m';

console.log( brown + "reveal.js:" + reset + " Multiplex running on port " + green + opts.port + reset );
