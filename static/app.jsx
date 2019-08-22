''.__proto__.trimChar = function(c){
	var s = this.toString();
	if (c === "]") c = "\\]";
	if (c === "\\") c = "\\\\";
	return s.replace(new RegExp(
	"^[" + c + "]+|[" + c + "]+$", "g"
	), "");
};

class Header extends React.Component
{
	constructor(props){
		super(props);
		
		this.logout = this.logout.bind(this);
		
	}
	logout(){
		
		this.props.socket.emit('auth', {type: 'logout'});
		window.localStorage.removeItem('xmonitor-session');
		this.props.authState(false);
		
	}
	render(){
		var serverStart = '...';
		if(this.props.serverInfo.hasOwnProperty('server')){
			serverStart = (new Date(this.props.serverInfo.server.start_time)).toLocaleString();
		}
		var scriptStart = '';
		if(this.props.scriptId && this.props.serverInfo.hasOwnProperty(this.props.scriptId)){
			var ac = this.props.serverInfo[this.props.scriptId].access;
			var editable = ac.indexOf('w')>=0;
			var executable = ac.indexOf('x')>=0;
			var color = 'badge badge-primary';
			if(editable){
				color = 'badge badge-success';
			}else
			if(executable){
				color = 'badge badge-warning';
			}
			scriptStart = (new Date(this.props.serverInfo[this.props.scriptId].start_time)).toLocaleString();
			scriptStart = (<span className="navbar-text" style={{'background': '#e1e1e1', 'padding': '5px 10px', 'border-radius': '8px'}}>
								<div>Script started <span className={color}>{ac}</span></div>
								{scriptStart}
							</span>);
		}
		var search = '';
		if(scriptStart){
			search = (<div style={{position: 'relative'}}>
						<label for="sq" className="far fa-list-alt" style={{position: 'absolute', top: '12px', left: '10px'}}></label>
						<input onChange={this.props.search} id="sq" type="search" className="form-control" placeholder="Search" style={{'padding-left': '31px'}} />
					</div>);
		}
		return(<nav className="navbar navbar-expand-lg navbar-light bg-light">
				  <a className="navbar-brand">XMonitor</a>
				  <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarText" aria-controls="navbarText" aria-expanded="false" aria-label="Toggle navigation">
					<span className="navbar-toggler-icon"></span>
				  </button>
				  <div className="collapse navbar-collapse" id="navbarText">
					
					<div className="row align-items-center mt-3 mt-md-0" style={{'width': '100%'}}>
						<div className="col-6 col-md-auto text-muted">
							<div>Server started</div>
							{serverStart}
						</div>
						<div className="col-6 col-md-auto text-muted">
							{scriptStart}
						</div>
						<div className="col"></div>
						<div className="col-12 col-md-auto mt-3 mb-3 mt-md-0 mb-md-0">
							{search}
						</div>
						<div className="col col-auto">
							<button className="btn btn-sm btn-danger" onClick={this.logout}>Logout</button>
						</div>
					</div>
				  </div>
				</nav>);
	}
}

/** **********************
 **       NAVIGATOR
 ** **********************/
let navigatorActivePath = '';
class NavItem extends React.Component
{
	constructor(props){
		super(props);
		
		this.state = {isOpen: false};
		this.toggleList = this.toggleList.bind(this);
	}
	toggleList(){
		this.setState({isOpen: !this.state.isOpen});
	}
	render(){
		var item = this.props.item;
		var linkPath = '#'+this.props.parentPath+'/'+item.name;
		var class_str = "list-group-item list-group-item-action";
		var class_plus = this.state.isOpen ? 'far fa-minus-square' : 'far fa-plus-square';
		return <li className={class_str}><span>{item.type=='object'? [<span className={class_plus} onClick={this.toggleList}></span>,<a style={linkPath.substr(1)==this.props.activePath ? {color: 'red', marginLeft: '10px'} : {marginLeft: '10px'}} href={linkPath} onClick={this.props.choosePath}>{item.name}</a>] : item.name}<code style={{marginRight: '10px'}}> - {item.type}</code></span>{this.state.isOpen ? <NavigatorList path={this.props.parentPath+'/'+item.name} choosePath={this.props.choosePath} scriptId={this.props.scriptId} activePath={this.props.activePath} opened={this.state.isOpen} socket={this.props.socket} /> : (item.value ? <div className="badge badge-secondary previewValue" title={item.value}>{item.value}</div> : '')}</li>;
	}
}
class NavigatorList extends React.Component
{
	constructor(props){
		super(props);
		this.state = {list: [], scriptId: props.scriptId, opened: false};
		this.refreshItemsList = this.refreshItemsList.bind(this);
		this.resItemsList = this.resItemsList.bind(this);
		
		this.props.socket.on('itemsList', this.resItemsList);
	}
	refreshItemsList(){
		if(this.props.scriptId=='' || !this.props.opened) return;
		this.props.socket.emit('itemsList', {sid: this.props.scriptId, path: this.props.path});
	}
	resItemsList(res){
		if(res.path!=this.props.path) return;
		this.setState({list: res.list});
	}
	componentWillMount(){
		this.refreshItemsList();
	}
	componentWillUnmount(){
		this.props.socket.off('itemsList', this.resItemsList);
	}
	render(){
		if(this.props.scriptId!=this.state.scriptId || this.props.opened!=this.state.opened){
			this.setState({scriptId: this.props.scriptId, opened: this.props.opened});
			if(this.props.scriptId!='' || this.props.opened){
				this.refreshItemsList();
			}
		}
		var scriptId = this.props.scriptId;
		var path = this.props.path;
		var activePath = this.props.activePath;
		var socket = this.props.socket;
		var choosePath = this.props.choosePath;
		return <ul className="list-group list-group-flush" style={{display: this.props.opened?'block':'none'}}>{scriptId!='' ? this.state.list.map(function(item){ return <NavItem parentPath={path} activePath={activePath} choosePath={choosePath} socket={socket} scriptId={scriptId} item={item} />; }) : ''}</ul>;
	}
}
class NavigatorSelect extends React.Component
{
	render(){
		var options = [];
		for(var id in this.props.list)
			if(id!='server') options.push(<option value={id} selected={this.props.selected==id}>{this.props.list[id].src}</option>);
		return <select onChange={this.props.onChange} className="form-control"><option value="">Select from list</option>{options}</select>;
	}
}
class Navigator extends React.Component
{
	constructor(props){
		super(props);
		this.state = {scriptId: props.scriptId, scriptsList: [], itemsList: []};
		this.refreshScriptsList = this.refreshScriptsList.bind(this);
		this.parentRefreshItemsList = this.parentRefreshItemsList.bind(this);
		this.chooseScript       = this.chooseScript.bind(this);
		
		this.props.socket.on('scriptsList', (function(list){
			if(this.props.scriptId!='' && !list.hasOwnProperty(this.props.scriptId)){
				this.setState({scriptId: ''});
				this.props.chooseScript('');
			}
			this.setState({scriptsList: list});
			this.props.updateServerInfo(list);
		}).bind(this));
		
	}
	parentRefreshItemsList(){
		if(this.props.scriptId=='') return;
		this.props.socket.emit('itemsList', {sid: this.props.scriptId, path: ''});
	}
	chooseScript(event){
		var id = event.target.value;
		console.log('Script change to '+id);
		this.setState({scriptId: id});
	}
	refreshScriptsList(){
		this.props.socket.send('scriptsList');
	}
	componentWillMount(){
		this.refreshScriptsList();
	}
	render(){
		var home = '';
		if(this.props.scriptId) home = <h5 style={{margin: '15px 0px'}}><a href="#/" onClick={this.props.choosePath} style={{color: (this.props.activePath=='/' ? 'red' : '')}}>🏠 Home dir</a><span className="icon icon-refresh" style={{marginLeft: '10px', cursor: 'pointer'}} onClick={this.parentRefreshItemsList} title="Refresh main list of menu"></span></h5>;
		return <div style={{marginTop: '20px'}}>
			<NavigatorSelect onChange={this.props.chooseScript} selected={this.props.scriptId} list={this.state.scriptsList} />
			<div class="d-none d-lg-block">
				{home}
				<NavigatorList path="" activePath={this.props.activePath} choosePath={this.props.choosePath} scriptId={this.props.scriptId} socket={this.props.socket} opened={this.props.scriptId!=''} />
			</div>
		</div>;
	}
}

/** *************************
 ** CONTAINER FOR EDIT VARS
 ** *************************/
let addConsoleLog = function(){};
class Container extends React.Component{
	constructor(props){
		super(props);
		this.state = {list: [], isCheckAccess: false, isWrite: false, isExecute: false};
		
		this.refreshVarList = this.refreshVarList.bind(this);
		this.updateVar = this.updateVar.bind(this);
		this.runFunction = this.runFunction.bind(this);
		
		this.props.socket.on('varList', (function(list){
			if(this.props.scriptId=='' || this.props.scriptId!=list.scriptId || this.props.path!=list.path) return;
			this.setState({list: list.list, isCheckAccess: false});
		}).bind(this));
	}
	refreshVarList(){
		if(!this.props.scriptId || !this.props.path){
			if(this.state.list.length) this.setState({list: [], isCheckAccess: false});
			return;
		}
		this.props.socket.emit('varList', {sid: this.props.scriptId, path: this.props.path});
	}
	updateVar(event){
		if(!this.state.isWrite) return;
		if(!this.props.scriptId || !this.props.path){
			if(this.state.list.length) this.setState({list: [], isCheckAccess: false});
			return;
		}
		var value = event.target.value;
		if(value != '' && typeof value == 'string' && !isNaN(value)){
			if(value.indexOf('.')){
				value = parseFloat(value);
			}else{
				value = parseInt(value);
			}
		}
		var index = event.target.dataset.index;
		var path = event.target.dataset.path;
		this.props.socket.emit('updateVar', {scriptId: this.props.scriptId, path: path, index: index ? index : '', value: value});
	}
	runFunction(o){
		if(!this.state.isExecute) return;
		for(var i in o.props){
			var value = o.props[i];
			if(value!='' && typeof value == 'string' && !isNaN(value)){
				if(value.indexOf('.')){
					value = parseFloat(value);
				}else{
					value = parseInt(value);
				}
				o.props[i] = value;
			}
		}
		this.props.socket.emit('runFunc', {scriptId: this.props.scriptId, path: o.path, props: o.props});
	}
	componentWillMount(){
		this.refreshVarList();
		setInterval(this.refreshVarList, 1000);
	}
	render(){
		if(!this.state.isCheckAccess && this.props.scriptId && this.props.serverInfo.hasOwnProperty(this.props.scriptId)){
			var isWrite = false;
			var isExecute = false;
			var access = this.props.serverInfo[this.props.scriptId].access;
			isWrite = access.indexOf('w')>=0;
			isExecute = access.indexOf('x')>=0;
			this.setState({isCheckAccess: true, isWrite: isWrite, isExecute: isExecute});
		}
		return <div className="blockContainer"><ContainerHeader path={this.props.path} choosePath={this.props.choosePath} socket={this.props.socket} /><ContainerBody path={this.props.path} choosePath={this.props.choosePath} updateVar={this.updateVar} runFunction={this.runFunction} socket={this.props.socket} list={this.state.list} isWrite={this.state.isWrite} isExecute={this.state.isExecute} search={this.props.search} /></div>;
	}
}
class ContainerHeader extends React.Component{
	render(){
		if(!this.props.path) return '';
		return <div style={{margin: '15px 0px'}}><ContainerHeaderBreadcrumb path={this.props.path} choosePath={this.props.choosePath} /></div>;
	}
}
class ContainerHeaderBreadcrumb extends React.Component{
	render(){
		var list = this.props.path.trimChar('#').trimChar('/').split('/');
		if(list[0]!=='') list.splice(0, 0, '');
		var count = list.length;
		var i = 0;
		var spell = '#';
		var choosePath = this.props.choosePath;
		return <nav aria-label="breadcrumb">
			<ol className="breadcrumb">
			{list.map(function(n){
				spell += '/'+n;
				if(n==='') n = '🏠 Home';
				if((++i)==count){
					return <li className="breadcrumb-item active" aria-current={n+' > '+spell}>{n}</li>;
				}else{
					return <li className="breadcrumb-item"><a href={spell} onClick={choosePath}>{n}</a></li>;
				}
			})}
			</ol>
		</nav>;
	}
}
class ContainerBody extends React.Component{
	render(){
		var search = this.props.search.trim();
		var path = this.props.path;
		var choosePath = this.props.choosePath;
		var updateVar = this.props.updateVar;
		var runFunction = this.props.runFunction;
		var isWrite = this.props.isWrite;
		var isExecute = this.props.isExecute;
		return <div className="containerBody">{this.props.list.map(function(item){
			
			if(search && item.name.indexOf(search)<0 && item.value.toString().indexOf(search)<0){
				return '';
			}
			
			return <BodyItem parentPath={path} updateVar={updateVar} runFunction={runFunction} choosePath={choosePath} item={item} isWrite={isWrite} isExecute={isExecute} />;
			
		})}</div>;
	}
}
class BodyItem extends React.Component{
	constructor(props){
		super(props);
		
		this.state = {lockValue: '', lockIndex: ''};
		
		this.blurUpdateVar = this.blurUpdateVar.bind(this);
		this.listArray = this.listArray.bind(this);
		this.listArrayItem = this.listArrayItem.bind(this);
		this.formatValue = this.formatValue.bind(this);
		this.lock = 0;
		this.lockTimer = 0;
		this.lockValue = '';
	}
	listArray(arr, key = ''){
		var arrItem = this.listArrayItem;
		var i = 0;
		return <ol>{arr.map(function(o){ return arrItem(o, key, i++); })}</ol>;
	}
	listArrayItem(o, key = '', i = 0){
		return <li>{this.formatValue(o, key, i)}</li>;
	}
	blurUpdateVar(event){
		this.props.updateVar(event);
	}
	formatValue(item, key = '', index = ''){
		var parentPath = this.props.parentPath;
		if(parentPath=='/') parentPath = '';
		if(key) item.name = key;
		var clear_path = parentPath ? parentPath+'/'+item.name : item.name;
		var input = '';
		if(item.type=='string' || item.type=='number'){
			input = <BodyItemInputString path={clear_path} index={index} blurUpdateVar={this.blurUpdateVar} item={item} isWrite={this.props.isWrite} />;
		}else
		if(item.type=='boolean'){
			if(!this.props.isWrite){
				item.value = item.value.toString();
				input = <BodyItemInputString path={clear_path} index={index} blurUpdateVar={this.blurUpdateVar} item={item} isWrite={false} />;
			}else{
				input = <BodyItemInputBool path={clear_path} index={index} blurUpdateVar={this.blurUpdateVar} item={item} />;
			}
		}else
		if(item.type=='object'){
			if(index) clear_path += '/'+index;
			input = <a href={'#'+clear_path} onClick={this.props.choosePath} className="btn btn-warning">Open</a>
		}else
		if(item.type=='array'){
			var childKey = item.name;
			if(index) childKey += '/'+index;
			input = this.listArray(item.value, childKey);
		}else
		if(item.type=='function'){
			if(this.props.isExecute){
				if(index) clear_path += '/'+index;
				input = <BodyItemFunction path={clear_path} runFunction={this.props.runFunction} item={item} />;
			}
		}else{
			input = <i>Unsupport</i>;
		}
		return input;
	}
	render(){
		var item = this.props.item;
		if(this.lock){
			if(this.state.lockIndex != ''){
				item.value[this.state.lockIndex].value = this.state.lockValue;
			}else{
				item.value = this.state.lockValue;
			}
		}
		var input = this.formatValue(item);
		if(!input) return '';
		
		return <div className="row mb-3"><div className="col-12 col-md-3">{item.name}</div><div className="col-12 col-md-9">{input}</div></div>;
	}
}
class BodyItemInputString extends React.Component{
	constructor(props){
		super(props);
		
		this.state = {lockValue: ''};
		
		this.focusUpdateVar = this.focusUpdateVar.bind(this);
		this.blurUpdateVar = this.blurUpdateVar.bind(this);
		this.updateVar = this.updateVar.bind(this);
		this.lock = 0;
		this.lockTimer = 0;
	}
	focusUpdateVar(event){
		if(this.lockTimer) clearTimeout(this.lockTimer);
		this.lock = 1;
		this.state.lockValue = event.target.value;
	}
	blurUpdateVar(event){
		this.props.blurUpdateVar(event);
		this.lockTimer = setTimeout(((function(){ this.lock = 0; }).bind(this)), 3000);
	}
	updateVar(event){
		this.setState({lockValue: event.target.value});
	}
	render(){
		var item = this.props.item;
		if(this.lock) item.value = this.state.lockValue;
		item.value = item.value.toString();
		if(item.value.length > 50 || item.value.indexOf('\n')>=0){
			return (<textarea rows="3" className="form-control" readOnly={!this.props.isWrite} data-path={this.props.path} data-index={this.props.index} onFocus={this.focusUpdateVar} onBlur={this.blurUpdateVar} onChange={this.updateVar}>{item.value}</textarea>);
		}else{
			return <input className="form-control" type="text" readOnly={!this.props.isWrite} value={item.value} data-path={this.props.path} data-index={this.props.index} onFocus={this.focusUpdateVar} onBlur={this.blurUpdateVar} onChange={this.updateVar} />;
		}
	}
}
class BodyItemInputBool extends React.Component{
	constructor(props){
		super(props);
		
		this.updateVar = this.updateVar.bind(this);
	}
	updateVar(event){
		var target = {
			target: {
				value: event.target.value=='true' ? true : false,
				dataset: {
					path: event.target.dataset.path,
					index: event.target.dataset.index,
				}
			}
		};
		this.props.blurUpdateVar(target);
	}
	render(){
		var item = this.props.item;
		return <select className="form-control" data-path={this.props.path} data-index={this.props.index} onChange={this.updateVar}>
		{[true, false].map(function(v){
			return <option selected={item.value==v}>{v.toString()}</option>;
		})}
		</select>;
	}
}
class BodyItemFunction extends React.Component{
	constructor(props){
		super(props);
		
		this.state = {
			vars: [],
			props: {}
		};
		this.fn_vars_str = this.props.item.value.vars.join(', ');
		
		this.props.item.value.vars.map((function(v){
			v = v.split('=');
			var v_name = v[0].trim();
			var v_placeholder = v[1] ? v[1].trim() : '';
			this.state.vars.push({name: v_name, value: v_placeholder});
			this.state.props[v_name] = v_placeholder;
		}).bind(this));
		
		this.updateProp = this.updateProp.bind(this);
		this.runFunction = this.runFunction.bind(this);
		
	}
	updateProp(event){
		var o = {props: this.state.props};
		o.props[event.target.dataset.name] = event.target.value;
		this.setState(o);
	}
	runFunction(){
		if(!confirm('Confirm run of function ('+this.props.item.value.name+'!)')) return;
		this.props.runFunction({path: this.props.path, props: this.state.props});
	}
	render(){
		var item = this.props.item;
		return ([
		<div><span className="badge badge-secondary">{item.name}</span> -> <span className="badge badge-dark">{item.value.name}({this.fn_vars_str})</span></div>,
		<div className="input-group mb-3">
			{this.state.vars.map((function(v){
				var value = v.value;
				if(this.state.props[v.name]!=value)
					value = this.state.props[v.name];
				
				return ([
				<div className="input-group-prepend">
					<span className="input-group-text">{v.name}</span>
				</div>,
				<input type="text" className="form-control" aria-label={v.value} placeholder={v.value} value={value} data-name={v.name} onChange={this.updateProp} />
				]);
			}).bind(this))}
			<div className="input-group-append">
				<button className="btn btn-danger" type="button" onClick={this.runFunction}>Run</button>
			</div>
		</div>
		]);
	}
}

class Console extends React.Component{
	constructor(props){
		super(props);
		
		this.state = {list: [], blockAutoScroll: 0};
		this.addConsoleLog = this.addConsoleLog.bind(this);
		addConsoleLog = this.addConsoleLog;
		this.scrollToBottom = this.scrollToBottom.bind(this);
		this.autoscroll = this.autoscroll.bind(this);
		
		this.props.socket.on('console', this.addConsoleLog);
	}
	addConsoleLog(log){
		if(this.state.list.length>0){
			if(this.state.list.length>100) this.state.list.shift();
			var lastLog = this.state.list[ this.state.list.length-1 ];
		}
		if(typeof lastLog != 'undefined' && lastLog.type==log.type && lastLog.text==log.text){
			lastLog.count += log.count;
		}else{
			this.state.list.push(log);
		}
		this.setState({list: this.state.list});
	}
	componentDidUpdate(){
		this.scrollToBottom();
	}
	scrollToBottom(){
		if(this.state.blockAutoScroll) return;
		this.bottom.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
	}
	autoscroll(e){
		this.setState({blockAutoScroll: !e.target.checked});
	}
	render(){
		return <div className="blockConsole mt-3">
			<div className="blockConsole_header"><span style={{'margin-right': '20px'}}>Console</span><label style={{'vertical-align': 'middle'}}><input type="checkbox" style={{'vertical-align': 'middle'}} onChange={this.autoscroll} checked={!this.state.blockAutoScroll} /> autoscroll</label></div>
			<div className="blockConsole_container" onScroll={this.wasScroll}>
				<ConsoleList list={this.state.list} />
				<div style={{ float:"left", clear: "both" }} ref={(el) => { this.bottom = el; }}></div>
			</div>
		</div>;
	}
}
class ConsoleList extends React.Component{
	render(){
		return <ul>{this.props.list.map(function(log){ return <ConsoleItem log={log} />; })}</ul>;
	}
}
class ConsoleItem extends React.Component{
	render(){
		var log = this.props.log;
		var class_str = "";
		var class_badge = "badge badge-light";
		switch(log.type){
			case 'warn':
				class_str = "alert alert-warning";
				class_badge = "badge badge-warning";
				break;
			case 'error':
				class_str = "alert alert-danger";
				class_badge = "badge badge-danger";
				break;
		}
		return <li className={class_str}>{log.count>1 ? <span className={class_badge}>{log.count}</span> : ''}{log.text=='' ? <i>Empty</i> : <pre>{log.text}</pre>}</li>;
	}
}
class Auth extends React.Component
{
	constructor(props){
		super(props);
		var getSession = window.localStorage.getItem('xmonitor-session');
		if(!getSession) getSession = '';
		this.state = {session: getSession, visiblePass: false, singin: false, fail: '', isFirstCheck: getSession ? false : true};
		
		this.getFail = this.getFail.bind(this);
		this.getAuth = this.getAuth.bind(this);
		this.removeAuth = this.removeAuth.bind(this);
		this.sendKey = this.sendKey.bind(this);
		this.toggleVisionPass = this.toggleVisionPass.bind(this);
		this.resultAuth = this.resultAuth.bind(this);
		this.pressKey = this.pressKey.bind(this);
		
		this.props.socket.on('auth', this.resultAuth);
		
		this.getAuth();
	}
	getFail(){
		var fail = this.state.fail;
		if(!fail) return '';
		return [' - ', <i className="badge badge-warning">{fail}</i>];
	}
	resultAuth(res){
		if(res.type=='fail'){
			this.setState({fail: res.error, singin: false, isFirstCheck: true});
		}else
		if(res.type=='expired'){
			window.localStorage.removeItem('xmonitor-session');
			this.setState({session: '', fail: '', singin: false, isFirstCheck: true});
			this.props.authState(false);
		}else
		if(res.type=='success'){
			window.localStorage.setItem('xmonitor-session', res.session);
			this.setState({session: res.session, fail: '', singin: false, isFirstCheck: true});
			this.props.authState(true);
		}
	}
	getAuth(){
		
		var getSession = window.localStorage.getItem('xmonitor-session');
		if(!getSession){
			this.props.authState(false);
		}else{
			this.props.socket.emit('auth', {type: 'check', session: getSession});
		}
		
	}
	removeAuth(){
		
		this.props.socket.emit('auth', {type: 'logout'});
		window.localStorage.removeItem('xmonitor-session');
		this.setState({session: '', fail: '', singin: false, isFirstCheck: true});
		this.props.authState(false);
		
	}
	sendKey(){
		var key = auth_input.value;
		if(!key || this.state.singin) return;
		this.setState({singin: true});
		this.props.socket.emit('auth', {type: 'singin', key: key});
	}
	toggleVisionPass(){
		this.setState({visiblePass: !this.state.visiblePass});
	}
	pressKey(e){
		if(e.key == 'Enter'){
			this.sendKey();
		}
	}
	render(){
		
		if(!this.state.isFirstCheck){
			return (<div className="card">
			  <div className="card-body">
				<h5 className="card-title">Authorization</h5>
				<h6 className="card-subtitle mb-2 text-muted">XMonitor - check session, please wait...</h6>
			  </div>
			</div>);
		}
		
		return (<div className="card" style={{'margin-top': '30px'}}>
		  <div className="card-body">
			<h5 className="card-title">Authorization</h5>
			<h6 className="card-subtitle mb-2 text-muted">XMonitor{this.getFail()}</h6>
			<p className="card-text">
				<label>Key</label>
				<div style={{'margin-top': '10px', 'position': 'relative'}}>
					<input onKeyPress={this.pressKey} style={{'width': 'calc(100% - 35px)'}} id="auth_input" type={this.state.visiblePass ? "text" : "password"} className="form-control" />
					<span style={{position: 'absolute', top: '10px', right: 0, cursor: 'pointer'}} className={this.state.visiblePass ? "far fa-eye" : "far fa-eye-slash"} onClick={this.toggleVisionPass}></span>
				</div>
			</p>
			<button className="btn btn-primary" onClick={this.sendKey}>{this.state.singin ? 'Processing...' : 'Sign in'}</button>
		  </div>
		</div>);
	}
}
class MainBlock extends React.Component{
	constructor(props){
		super(props);
		this.props.socket = {};
		this.state = {isConnect: null, scriptId: '', path: '', auth: false, serverInfo: {}, search: ''};
		this.updateServerInfo = this.updateServerInfo.bind(this);
		this.chooseScript = this.chooseScript.bind(this);
		this.choosePath = this.choosePath.bind(this);
		this.search = this.search.bind(this);
		this.authState = this.authState.bind(this);
		this.isConnect = this.isConnect.bind(this);
	}
	updateServerInfo(list){
		this.setState({serverInfo: list});
	}
	authState(is){
		this.setState({auth: !!is});
	}
	chooseScript(event){
		var id = typeof event == 'string' ? event : event.target.value;
		console.log('Script change to \''+id+'\'');
		if(id==''){
			this.setState({scriptId: '', path: ''});
			$("title").text('XMonitor');
		}else{
			this.setState({scriptId: id, path: '/'});
			$("title").text('XMonitor: /');
		}
	}
	choosePath(event){
		var id = event.target.href;
		id = id.substr(id.indexOf('#')+1);
		console.log('Path change to \''+id+'\'');
		this.setState({path: id});
		$("title").text('XMonitor: /'+id);
	}
	search(e){
		var text = e.target.value.trim();
		this.setState({search: text});
	}
	isConnect(is){
		this.setState({isConnect: !!is});
	}
	componentWillMount(){
		var port = this.props.socketPort;
		var setIsConnect = this.isConnect;
		console.log('Socket connecting on: //'+document.location.hostname+':{socket_port}');
		this.props.socket = io.connect('//'+document.location.hostname+':'+port);
		this.props.socket.on('alert', function(text){ alert("Message from server:\n\n"+text); });
		this.props.socket.on('connect', function(){
			setIsConnect(true);
		});
		this.props.socket.on('disconnect', (function(){
			setIsConnect(false);
			this.setState({auth: false});
		}).bind(this));
	}
	render(){
		if(!this.state.isConnect && this.state.isConnect!==null){
			return <div className="alert alert-danger" style={{'margin': '30px 10px'}}>Server is unavailable</div>;
		}
		if(!this.state.auth){
			return <div className="container"><Auth authState={this.authState} socket={this.props.socket} /></div>;
		}
		return (<div className="container">
			<Header serverInfo={this.state.serverInfo} scriptId={this.state.scriptId} socket={this.props.socket} search={this.search}></Header>
			<div className="row">
				<div className="col-12 col-lg-3"><Navigator chooseScript={this.chooseScript} choosePath={this.choosePath} scriptId={this.state.scriptId} activePath={this.state.path} updateServerInfo={this.updateServerInfo} socket={this.props.socket} /></div>
				<div className="col-12 col-lg-9"><Container serverInfo={this.state.serverInfo} path={this.state.path} choosePath={this.choosePath} scriptId={this.state.scriptId} socket={this.props.socket} search={this.state.search} /><Console scriptId={this.state.scriptId} socket={this.props.socket} /></div>
			</div>
		</div>);
	}
}

ReactDOM.render(
	<MainBlock socketPort="{socket_port}" />,
	document.getElementById("app")
)