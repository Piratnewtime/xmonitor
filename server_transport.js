class Struct
{
	constructor(){
		this.props = {
			method: '',
			path_str: '',
			data: {},
		};
		for(var k in this.props){
			this[k] = this.props[k];
		}
	}
	parse(json_str){
		var data = JSON.parse(json_str);
		for(var k in this.props){
			if(typeof data[k] == typeof this.props[k]){
				this[k] = data[k];
			}
		}
	}
	format(){
		var res = {};
		for(var k in this.props){
			res[k] = this[k];
		}
		return JSON.stringify(res);
	}
}

class Response extends Struct
{
	constructor(str){
		super();
		if(str[0]=='{'){
			this.parse(str);
		}
	}
	isHelo(){
		return this.method=='helo';
	}
	isEhlo(){
		return this.method=='ehlo';
	}
	isPing(){
		return this.method=='ping';
	}
	isPong(){
		return this.method=='ping';
	}
}

class Request extends Struct
{
	constructor(path_str = ''){
		super();
		this.path_str = path_str;
	}
	get(){
		this.method = 'get';
		return this.format();
	}
	update(value){
		this.method = 'update';
		this.data = value;
		return this.format();
	}
	put(value){
		this.method = 'put';
		this.data = value;
		return this.format();
	}
	helo(){
		this.method = 'helo';
		return this.format();
	}
	ehlo(){
		this.method = 'ehlo';
		return this.format();
	}
	ping(){
		this.method = 'ping';
		return this.format();
	}
	pong(){
		this.method = 'pong';
		return this.format();
	}
	ok(){
		this.method = 'success';
		return this.format();
	}
}

module.exports = {
	Request: Request,
	Response: Response,
};