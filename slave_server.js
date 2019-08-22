const st	= require('./server_transport');

const start_time = (new Date()).getTime();

''.__proto__.trimChar = function(c){
	var s = this.toString();
	if (c === "]") c = "\\]";
	if (c === "\\") c = "\\\\";
	return s.replace(new RegExp(
	"^[" + c + "]+|[" + c + "]+$", "g"
	), "");
};

let is_connect = 0;
const io = require('socket.io-client'),
socket = io.connect('ws://localhost:9696', {reconnect: true});

// Modify console
console.original = {
	log: console.log,
	warn: console.warn,
	error: console.error,
};

const parseLogText = function(data){
	var text = '';
	switch(typeof data){
		case 'string':
		case 'number':
			text = data;
			break;
		case 'boolean':
			text = data.toString();
			break;
		case 'object':
			text = JSON.stringify(data, undefined, 2);
			break;
	}
	return text;
};

console.log = function(props){
	if(is_connect) socket.emit('console', {type: 'log', count: 1, text: parseLogText(props)});
	console.original.log(props);
};

console.warn = function(props){
	if(is_connect) socket.emit('console', {type: 'warn', count: 1, text: parseLogText(props)});
	console.original.warn(props);
};

console.error = function(props){
	if(is_connect) socket.emit('console', {type: 'error', count: 1, text: parseLogText(props)});
	console.original.error(props);
};

alert = function(props, client = ''){
	if(is_connect) socket.emit('alert', {client: client, text: parseLogText(props)});
};

var stack = {}, crutchs = {};

const get_object = path_str => {
	if(typeof path_str != 'string') return false;
	var obj = stack;
	path = path_str.trim().trimChar('/').split('/');
	if(path.length>0) for(var i in path) if(path[i]!='') obj = obj[path[i]];
	return obj;
};

const update_object = (path_str, value, array_index) => {
	if(typeof path_str != 'string'){
		console.error('Update path is not a string ('+(typeof path_str)+')');
		return false;
	}
	path = path_str.trim().trimChar('/');
	if(crutchs[path]){
		stack[path] = crutchs[path](value, array_index);
		if(array_index!=''){
			console.warn('SCRIPT UPDATE! (Crutch) '+path_str+':'+array_index+' => '+value);
		}else{
			console.warn('SCRIPT UPDATE! (Crutch) '+path_str+' => '+value);
		}
		return;
	}else
	if(array_index!=undefined && array_index!==''){
		path += '/'+array_index;
	}
	path = path.split('/');
	var eval_str = "stack";
	if(path.length>0) for(var i in path){
		var p = path[i];
		if(p==='') continue;
		p = p.replace(/\\/g,'').replace(/\'/g,'').replace(/\"/g,'\\"');
		eval_str += "['"+p+"']";
	}
	if((isNaN(value) || !value.toString().trim()) && typeof value != 'boolean'){
		value = value.replace(/\\/g,'\\\\').replace(/\'/g,'\\\'').replace(/\"/g,'\\"').replace(/\0/g,'\\0');
		value = '\''+value+'\'';
	}
	eval_str += " = "+value+";";
	eval(eval_str);
	if(array_index){
		console.warn('SCRIPT UPDATE! '+path_str+':'+array_index+' => '+value);
	}else{
		console.warn('SCRIPT UPDATE! '+path_str+' => '+value);
	}
};

var ac = {};

socket.on('connect', function(){
	is_connect = 1;
	console.log("socket connected");
	socket.emit('ehlo', {src: module.parent.filename, start_time: start_time});
	if(Object.keys(ac)) socket.emit('ac', ac);
	socket.emit('hello', '');
});
socket.on('disconnect', function(){ is_connect = 0; console.log("socket disconnect"); });

socket.on('itemsList', function(data){
	var list = [];
	var objs = get_object(data.path);
	for(var i in objs){
		var o = objs[i];
		var type = typeof o;
		var value = '';
		if(type == 'object'){
			if(o.constructor.name == 'Array'){
				type = 'array';
				value = o.toString().substr(0, 50);
			}
		}
		else
		{
			value = o.toString().substr(0, 50);
		}
		list.push({name: i, type: type, value: value});
	}
	data.list = list;
	socket.emit('itemsList', data);
});

socket.on('updateVar', function(data){
	update_object(data.path, data.value, data.index);
});

socket.on('runFunc', function(data){
	var fn = get_object(data.path);
	if(typeof fn != 'function'){
		console.error(data.path+' is not a function!');
		return;
	}
	console.log('Run function '+data.path);
	var res = fn(...Object.values(data.props));
	console.log(res);
	alert(res, data.client);
});

function formatVarItem(objs){
	var list = [];
	for(var i in objs){
		var o = objs[i];
		var type = typeof o;
		if(type=='object' && o.constructor.name == 'Array'){
			type = 'array';
			if(o.length) o = formatVarItem(o);
		}else
		if(type=='object'){
			o = '';
		}else
		if(type=='function'){
			var str_fn = o.toString();
			if(str_fn.indexOf('function')!==0) continue;
			var fn_name = o.name;
			if(!fn_name) fn_name = '__private';
			str_fn = str_fn.substr(str_fn.indexOf('(')+1);
			str_fn = str_fn.substr(0, str_fn.indexOf(')'));
			str_fn = str_fn.trim();
			var fn_vars = str_fn ? str_fn.split(',').map( _ => _.trim() ) : [];
			o = {name: fn_name, vars: fn_vars};
		}
		list.push({name: i, type: type, value: o}); // todo: array from objects
	}
	return list;
}

socket.on('varList', function(data){
	var objs = get_object(data.path);
	var list = formatVarItem(objs);
	data.list = list;
	socket.emit('varList', data);
});

module.exports = {
	add: function(name, obj, crutch){
		if(typeof name != 'string') return false;
		if((typeof obj != 'object' && typeof obj != 'function') || obj.constructor.name == 'Array'){
			if(typeof crutch == 'function'){
				crutchs[name] = crutch;
			}else{
				return false;
			}
		}
		stack[name] = obj;
		return true;
	},
	ac: function(obj){ // access control: is object {'key': 'rwx'} where level access r - read, w - write, x - execution functions
		ac = obj;
		if(is_connect) socket.emit('ac', obj);
	}
};