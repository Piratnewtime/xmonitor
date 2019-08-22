[![XMonitor Logo](https://elgod.pw/xmonitor/xmonitor_logo.png)](https://npmjs.org/package/xmonitor)

  Monitor of workspace for your scripts with editor during runtime script for [node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]


# Just install
```bash
$ npm install xmonitor
```

## Step two
You need create only one server for take access to your scripts.
```js
const webmonitor = require('xmonitor/master_server')(8080);

webmonitor.init_web('0.0.0.0', 4567);
```
Where **`8080`** is a socket's port for connect between user and server.

_All arguments used as default._

But ⚡**important**, you must have a free `9696` port! Module use this port for local connect to server!

## Step three
Add module to your work scripts
```js
const monitor = require('xmonitor');
```
and credentials of users for access
```js
monitor.ac({'admin': 'rwx', 'moder': 'rw'});
```
As you see for access need write login (use random key) and access level (**`r`** - read, **`w`** - modify, **`x`** - execution functions).

Flag **`r`** is always applied.

Next and most important - create points for control.

Example:
```js
function testfn(a, b = 1){
	return a+b;
}

let a = 1;
var b = `Test
textarea`;
const c = [3, false, testfn, ['lol', 'ok'], 'string', {check: true, check2: 'true'}, [123, {abc: 'ok'}]];
var d = {
	fn: testfn,
	e: '4',
};
var f = {
	g: 599999999999999,
	j: {k: 6},
	l: [7],
};

monitor.add('😀 a', a, val => (a = val)); // number
monitor.add('b', b, val => (b = val)); // string
monitor.add('c', c, (val, i) => { c[i] = val; return c; }); // array
monitor.add('d', d); // object with string
monitor.add('f', f); // multiobjects
monitor.add('function', function(){ return 'Hello, bro!'; }); // function
```
Little bit about arguments for `monitor.add`

**1-st** is name for item as you like.

**2-nd** is your variable.

**3-rd** is custom function for update variable (option). Only if variable is not an object or function.


## Finish!
Just start server and all your scripts from any folders!

And review it on address `http://host:4567` with your key that was wrote before!

[npm-image]: https://img.shields.io/npm/v/xmonitor.svg
[npm-url]: https://npmjs.org/package/xmonitor
