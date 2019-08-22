module.exports = {
	
	assoc: {},
	access: {},
	sessions: {},
	
	apply: function(src, array){
		for(var key in array){
			if(array[key].indexOf('r')<0) array[key] = 'r'+array[key];
			if(!this.access.hasOwnProperty(key)) this.access[key] = {};
			this.access[key][src] = array[key];
		}
		this.assoc[src] = array;
	},
	
	remove: function(src){
		if(!this.assoc.hasOwnProperty(src)) return;
		for(var key in this.assoc[src]){
			delete this.access[key][src];
		}
		if(!Object.keys(this.access[key]).length) delete this.access[key];
		delete this.assoc[src];
	},
	
	isAuth: function(key){
		return this.access.hasOwnProperty(key);
	},
	
	check: function(session, src){
		if(!this.sessions.hasOwnProperty(session)){
			return false;
		}
		var key = this.sessions[session];
		if(!this.assoc.hasOwnProperty(src)){
			return false;
		}else
		if(!this.assoc[src].hasOwnProperty(key)){
			return false;
		}else{
			return this.assoc[src][key];
		}
	},
	
	isWrite: function(session, src){
		if(!this.sessions.hasOwnProperty(session)){
			return false;
		}
		var key = this.sessions[session];
		var access = this.access[key][src];
		return access.indexOf('w')>=0;
	},
	
	isExecute: function(session, src){
		if(!this.sessions.hasOwnProperty(session)){
			return false;
		}
		var key = this.sessions[session];
		var access = this.access[key][src];
		return access.indexOf('x')>=0;
	},
	
	setSession: function(id, key){
		this.sessions[id] = key;
	},
	
	getSession: function(id){
		if(!this.sessions.hasOwnProperty(id)) return false;
		return this.sessions[id];
	},
	
	removeSession: function(id){
		if(!this.sessions.hasOwnProperty(id)) return false;
		delete this.sessions[id];
	}
	
};