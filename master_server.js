const fs	= require('fs'); // for web server
const mime	= require('mime-types'); // web mime of files
const express = require('express')();
const http	= require('http'); // web
const uuid  = require('uuid');
const st	= require('./server_transport'); // local format
const ac	= require('./access_control');

var webSocketClients = {};

const start_time = (new Date()).getTime();

var serverInfo = {server: {start_time: start_time}};

''.__proto__.trimChar = function(c){
	var s = this.toString();
	if (c === "]") c = "\\]";
	if (c === "\\") c = "\\\\";
	return s.replace(new RegExp(
	"^[" + c + "]+|[" + c + "]+$", "g"
	), "");
};

// Open local connect with scripts
const local_http = require('http').Server(express);
local_http.listen(9696, function(){
    console.log('Local xmonitor on port 9696');
});
const local_io = require('socket.io').listen(local_http);
//local_io.set('log level', 1);

local_io.sockets.on('connection', function (socket) {
	var ID = (socket.id).toString();
	console.log('New local client: '+ID);
	var time = (new Date).toLocaleTimeString();
	//socket.json.send({'event': 'connected', 'name': ID, 'time': time});
	
	// get info about connected script
	socket.on('ehlo', function(info){
		socket.filename = info.src;
		socket.start_time = info.start_time;
	});
	// set access users to script
	socket.on('ac', function(obj){
		ac.apply(socket.filename, obj);
	});
	// finish initialization script
	socket.on('hello', function(info){
		for(var sid in webSocketClients){
			var webSocket = webSocketClients[sid];
			// send message to web about new connection
			webSocket.emit('console', {type: 'warn', count: 1, text: 'File connected! '+socket.filename});
			var list = serverInfo;
			var clients = local_io.sockets.sockets;
			for(var id in clients){
				if(!clients[id].hasOwnProperty('filename')) continue;
				var access = ac.check(webSocket.webSession, clients[id].filename);
				if(!access) continue;
				list[id] = {src: clients[id].filename, access: access, start_time: clients[id].start_time};
			}
			webSocket.emit('scriptsList', list);
		}
	});
	// send out console message
	socket.on('console', function(data){
		console.log(data);
		for(var sid in webSocketClients){
			var webSocket = webSocketClients[sid];
			if(!webSocket.hasOwnProperty('isAuth') || !webSocket.isAuth) continue;
			webSocket.emit('console', data);
		}
	});
	// send out important console message
	socket.on('alert', function(data){
		console.log(data);
		if(!webSocketClients.hasOwnProperty(data.client)){
			for(var sid in webSocketClients){
				var webSocket = webSocketClients[sid];
				if(!webSocket.hasOwnProperty('isAuth') || !webSocket.isAuth) continue;
				webSocket.emit('alert', data.text);
			}
		}else{
			var webSocket = webSocketClients[data.client];
			if(!webSocket.hasOwnProperty('isAuth') || !webSocket.isAuth) return;
			webSocket.emit('alert', data.text);
		}
	});
	socket.on('itemsList', function(data){
		if(!webSocketClients.hasOwnProperty(data.client)) return;
		webSocketClients[data.client].emit('itemsList', {path: data.path, scriptId: socket.id, list: data.list});
	});
	socket.on('varList', function(data){
		if(!webSocketClients.hasOwnProperty(data.client)) return;
		webSocketClients[data.client].emit('varList', {path: data.path, scriptId: socket.id, list: data.list});
	});
	// send out notification about disconnected script
	socket.on('disconnect', function(){
		ac.remove(socket.filename);
		for(var sid in webSocketClients){
			var webSocket = webSocketClients[sid];
			webSocket.emit('console', {type: 'error', count: 1, text: 'File disconnected! '+socket.filename});
			var list = serverInfo;
			delete list[socket.id];
			var clients = local_io.sockets.sockets;
			for(var id in clients){
				if(!clients[id].hasOwnProperty('filename')) continue;
				var access = ac.check(webSocket.webSession, clients[id].filename);
				if(!access) continue;
				list[id] = {src: clients[id].filename, access: access, start_time: clients[id].start_time};
			}
			webSocket.emit('scriptsList', list);
		}
	});
});

module.exports = (webport = 8080)=>{
	
	// Opening new socket for web connections
	const io = require('socket.io').listen(webport);
	//io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		socket.isAuth = false;
		socket.webSession = '';
		webSocketClients[socket.id] = socket;
		console.log('New web client: '+socket.id);
		socket.on('auth', function(data){
			if(!data.hasOwnProperty('type')) return;
			var type = data.type;
			var error = 'Error 0';
			if(type=='singin'){
				if(!data.hasOwnProperty('key')){
					error = 'Empty key';
				}else
				if(typeof data.key != 'string'){
					error = 'Bad key!';
				}else
				if(!ac.isAuth(data.key)){
					error = 'Unknown key';
				}else{
					var session = uuid.v4();
					ac.setSession(session, data.key);
					socket.isAuth = true;
					socket.webSession = session;
					socket.emit('auth', {type: 'success', session: session});
					console.log('LOGIN: '+data.key+' ('+session+')');
					return;
				}
			}else
			if(type=='check'){
				if(!data.hasOwnProperty('session')){
					error = 'Empty session';
				}else
				if(typeof data.session != 'string'){
					error = 'Bad session!';
				}else
				if(!ac.getSession(data.session)){
					socket.isAuth = false;
					socket.webSession = '';
					socket.emit('auth', {type: 'expired'});
					return;
				}else{
					socket.isAuth = true;
					socket.webSession = data.session;
					socket.emit('auth', {type: 'success', session: data.session});
					return;
				}
			}else
			if(type=='logout'){
				if(socket.webSession){
					console.log('LOGOUT: '+ac.getSession(socket.webSession)+' ('+socket.webSession+')');
					socket.isAuth = false;
					socket.webSession = '';
					ac.removeSession(socket.webSession);
					socket.emit('auth', {type: 'expired'});
					return;
				}
			}
			socket.emit('auth', {type: 'fail', error: error});
		});
		socket.on('message', function (cmd) {
			if(!socket.isAuth) return;
			if(cmd=='scriptsList'){
				var list = serverInfo;
				var clients = local_io.sockets.sockets;
				for(var id in clients){
					if(!clients[id].hasOwnProperty('filename')) continue;
					var access = ac.check(socket.webSession, clients[id].filename);
					if(!access) continue;
					list[id] = {src: clients[id].filename, access: access, start_time: clients[id].start_time};
				}
				socket.emit('scriptsList', list);
			}
		});
		socket.on('itemsList', function(data){
			if(!socket.isAuth) return;
			if(!data.hasOwnProperty('sid')) return;
			if(!local_io.sockets.sockets.hasOwnProperty(data.sid)) return;
			local_io.sockets.sockets[data.sid].emit('itemsList', {client: socket.id, path: data.path});
		});
		socket.on('varList', function(data){
			if(!socket.isAuth) return;
			if(!data.hasOwnProperty('sid')) return;
			if(!local_io.sockets.sockets.hasOwnProperty(data.sid)) return;
			local_io.sockets.sockets[data.sid].emit('varList', {client: socket.id, path: data.path});
		});
		socket.on('updateVar', function(data){
			if(!socket.isAuth) return;
			if(!data.hasOwnProperty('scriptId')) return;
			if(!local_io.sockets.sockets.hasOwnProperty(data.scriptId)) return;
			var s = local_io.sockets.sockets[data.scriptId];
			if(!ac.isWrite(socket.webSession, s.filename)) return;
			s.emit('updateVar', {client: socket.id, path: data.path, index: data.index ? data.index : '', value: data.value});
		});
		socket.on('runFunc', function(data){
			if(!socket.isAuth) return;
			if(!data.hasOwnProperty('scriptId')) return;
			if(!local_io.sockets.sockets.hasOwnProperty(data.scriptId)) return;
			var s = local_io.sockets.sockets[data.scriptId];
			if(!ac.isExecute(socket.webSession, s.filename)) return;
			s.emit('runFunc', {client: socket.id, path: data.path, props: data.props});
		});
		socket.on('disconnect', function() {
			if(socket.webSession){
				socket.isAuth = false;
				socket.webSession = '';
				ac.removeSession(socket.webSession);
			}
			delete webSocketClients[socket.id];
		});
	});
	
	// List connected clients
	const list_clients = ()=>Object.keys(clients);
	const get_object = (root, path_str) => {
		if(typeof root != 'string' || typeof path_str != 'string') return false;
		if(!clients.hasOwnProperty(root)) return false;
		clients[root].send(new st.Request(path_str).get());
	};
	const update_object = (root, path_str, data) => {
		if(typeof root != 'string' || typeof path_str != 'string') return false;
		if(!clients.hasOwnProperty(root)) return false;
		clients[root].send(new st.Request(path_str).update(data));
	};
	
	// Initialization little http web server
	const init_web = (host = '0.0.0.0', port = 4567)=>{
		const root = 'node_modules/xmonitor/static/';
		
		http.createServer(function(req, res) {
			
			var code = 200;
			var header_host = req.headers.host.split(':')[0];
			var url = req.url.trimChar('/');
			var file_path = root+url.replace(/\s/g, '').replace(/..\//g, '').replace(/\/\//g, '');
			
			try {
				var stats = fs.lstatSync(file_path);

				if (stats.isDirectory()) {
					file_path += 'index.html';
				}
				
				if (!fs.existsSync(file_path)) {
					code = 404;
					file_path = root+'404.html';
				}
			}
			catch (e) {
				code = 404;
				file_path = root+'404.html';
			}
			
			var ex = file_path.split('.').splice(-1);
			ex = ex.length==1 ? ex[0] : '';
			
			if(ex=='css'){
				var file_mime = 'text/css';
			}else{
				var file_mime = mime.lookup(file_path);
			}
			var method = req.method;
			
			res.writeHead(code, file_mime);
			var file = fs.readFileSync(file_path);
			if(file_path==root+'index.html' || file_path==root+'app.jsx') file = file.toString().replace(/\{socket_port\}/g, webport).replace(/\{host\}/g, header_host);
			res.end(file);
			
		}).listen(port, host);

		console.log('Http web server listening on ' + host +':'+ port);
	};
	
	return {
		clients: list_clients,
		list: get_object,
		update: update_object,
		init_web: init_web,
	};
};
