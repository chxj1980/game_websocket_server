var render = true;
var exampleSocket;

var sendMessage = function(message){
	if(exampleSocket.readyState == 1){
		exampleSocket.send(message);
	}
}

function connectToSocket(key){
	//exampleSocket = new WebSocket('ws://192.168.2.3/socket', key);
	exampleSocket = new WebSocket('ws://192.168.2.3:5600', key);
	exampleSocket.binaryType =  "arraybuffer";

	var readystatecheck = function(){
		if(exampleSocket.readyState == 1) {
			exampleSocket.onmessage = function (event) {
				processMessage(event.data);
			}
			exampleSocket.onclose = function (event){
				open = false;
			}
			enterGame();
		}
		else if(exampleSocket.readyState <2)setTimeout(readystatecheck,1);
	}
	setTimeout(readystatecheck,1);
}

StartSocketHandshake();


function StartSocketHandshake(){ //inform server we wish to login then get Cookie and CSRF token from server
//	connectToSocket(29005);
/*	var	xmlhttp=new XMLHttpRequest();

	xmlhttp.onreadystatechange=function() {
		if (xmlhttp.readyState==4 && xmlhttp.status==200) {
			var data = JSON.parse(xmlhttp.responseText);
			connectToSocket(data.key); //start handshake
		}
	}
	xmlhttp.open("POST","/server",true);
	xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded, charset=UTF-8");
	xmlhttp.send();*/
}



var GMessageType = {
	MOVE:		1,
	ABILITY:	2,
	LOGIN:		3,
	LOGOUT: 	4
}



function sendMove(x, y){
	var buffer	= new ArrayBuffer(16);
	var view	= new DataView(buffer);
	view.setUint32(0,GMessageType.MOVE,true);
	view.setFloat32(4,x,true);
	view.setFloat32(8,y,true);
	view.setFloat32(12,0.0,true);
	sendMessage(buffer);
}

function enterGame(){
	var buffer	= new ArrayBuffer(16);
	var view	= new DataView(buffer);
	view.setUint32(0,GMessageType.LOGIN,true);
	view.setFloat32(4,8,true);
	view.setFloat32(8,8,true);
	view.setFloat32(12,0,true);
	sendMessage(buffer);
}


var screenWidth =0;
var screenHeight =0;


var gameObject = function(){
	var x = 8.0;
	var y = 8.0;
}

function setupCharacter(playerID){
	var characterBlock = document.createElement('div');
	characterBlock.id = 'player';
	characterBlock.className = 'character';
	characterBlock.setAttribute("style","background-color:#55FF88");
	characterBlock.style.display = "block";
	document.getElementsByTagName('body')[0].appendChild(characterBlock);
}

var moveAmount = 10;
function moveLeft(){
	movePlayer('player',moveAmount, 0);
}

function moveRight(){
	movePlayer('player',0-moveAmount, 0);
}

function moveUp(){
	movePlayer('player',0, 0-moveAmount);
}

function moveDown(){
	movePlayer('player',0, moveAmount);
}


function movePlayer(playerID, x, y){
	var player = document.getElementById('player');
	player.style.left = (player.offsetLeft + x) + "px";
	player.style.top = (player.offsetTop + y) + "px";

	sendMove(player.offsetLeft, player.offsetTop);
}

function moveTo(ID, x, y){
	ID.style.left = x + "px";
	ID.style.top = y + "px";
}















/*
function sendMove(x, y){
	var buffer	= new ArrayBuffer(12);
	var view	= new DataView(buffer);
	view.setUint32(0,GMessageType.MOVE,true);
	view.setFloat32(4,x,true);
	view.setFloat32(8,y,true);
	sendMessage(buffer);
	//sendMessage("move "+x+" "+y);
}

*/
function handleMove(message){
	var IDnum = message.getNextUint32();
	var ID = IDnum.toString();

	var x = message.getNextFloat32();
	var y = message.getNextFloat32();
	var z = message.getNextFloat32();

	//console.log("player "+ID+" moved to x="+x+" y="+y);
	moveCharacter(ID, x, y);
}


function handleLogin(message){
	var IDnum = message.getNextUint32();
	var ID = IDnum.toString();

	var x = message.getNextFloat32();
	var y = message.getNextFloat32();
	var z = message.getNextFloat32();

	//console.log("player "+ID+" logged in.");
	addCharacter(ID, x, y);
}


function handleLogout(message){
	var IDnum = message.getNextUint32();
	var ID = IDnum.toString();

	//console.log("player "+ID+" logged out.");
	removeCharacter(ID);
}




function PlayerMessage(s){
	this.offset = 0;
	this.view = new DataView(s);
	return this;
}
PlayerMessage.prototype.getNextUint32 = function(){
	var ret = this.view.getUint32(this.offset,true);
	this.offset +=4;
	return ret;
}
PlayerMessage.prototype.getNextUint16 = function(){
	var ret = this.view.getUint16(this.offset,true);
	this.offset +=2;
	return ret;
}
PlayerMessage.prototype.getNextUint8 = function(){
	var ret = this.view.getUint8(this.offset);
	this.offset +=1;
	return ret;
}
PlayerMessage.prototype.getNextInt32 = function(){
	var ret = this.view.getInt32(this.offset,true);
	this.offset +=4;
	return ret;
}
PlayerMessage.prototype.getNextInt16 = function(){
	var ret = this.view.getInt16(this.offset,true);
	this.offset +=2;
	return ret;
}
PlayerMessage.prototype.getNextInt8 = function(){
	var ret = this.view.getInt8(this.offset);
	this.offset +=1;
	return ret;
}
PlayerMessage.prototype.getNextFloat32 = function(){
	var ret = this.view.getFloat32(this.offset,true)
	this.offset +=4;
	return ret;
}
PlayerMessage.prototype.getNextFloat64 = function(){
	var ret = this.view.getFloat64(this.offset,true)
	this.offset +=8;
	return ret;
}




































function processMessage(s){
	if (s.byteLength == 0) return;
	var message = new PlayerMessage(s);

	while(message.offset < s.byteLength){
		var messType = message.getNextUint32();
		console.log(messType+" testing");
		if		(messType == GMessageType.LOGIN)	{ handleLogin	(message); }
		else if	(messType == GMessageType.LOGOUT)	{ handleLogout	(message); }
		else if	(messType == GMessageType.MOVE)		{ handleMove	(message); }
	}
}


function removeCharacter(ID){
	var characterBlock = document.getElementById(ID);

	if(characterBlock === null){
		console.log("removeCharacter characterBlock is null");
		return;
	}

	characterBlock.remove();
}


function addCharacter(ID, x, y){
	//console.log("addCharacter adding character "+ID);
	var characterBlock = document.createElement('div');
	characterBlock.id = ID;
	characterBlock.className = 'character';
	characterBlock.setAttribute("style","background-color:#55FF88");
	characterBlock.style.display = "block";
	document.getElementsByTagName('body')[0].appendChild(characterBlock);
	moveTo(characterBlock, x, y);
}


function moveCharacter(ID, x, y){
	var characterBlock = document.getElementById(ID);

	if(characterBlock === null){
		console.log("moveCharacter characterBlock is null");
		return;
	}
	moveTo(characterBlock, x, y);
}


function renderWorld(){
	//renderSpinnerTimer();
	if(render){
	//	var chatbox = document.getElementById('Server');
	//	var lim = (chatbox.scrollHeight - chatbox.scrollTop) - chatbox.clientHeight
	//	var bottom = (lim<10 && lim>-10);
	//	chatbox.innerHTML = Chat.render();
	//	if(bottom)chatbox.scrollTop = chatbox.scrollHeight;
	}
	//render = false;
	requestAnimationFrame(renderWorld);
}


window.onload = function(e){
	screenWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
	screenHeight = window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight;
    //setUpUI();
    setupCharacter();
    initInput();
    requestAnimationFrame(renderWorld);
}


var movementX =0;
var movementY =0;

function initInput() {
	document.addEventListener('keydown', function(event) {
		if(event.keyCode == 87) {//w
		   // forwardMove =true;
			moveUp();
		}
		else if(event.keyCode == 83) {//s
		    //backwardMove =true;
		    moveDown();
		}
		else if(event.keyCode == 65) {//a
		    //rightMove =true;
		    moveRight();
		}
		else if(event.keyCode == 68) {//d
		    //leftMove =true;
		    moveLeft();
		}
		//else if(event.keyCode >= 49 && event.keyCode <= 54) {// keys 1 through 6
		//    var button =document.getElementById('actionButton'+(event.keyCode-48));
		//	if(button.className == "actionOverlay"){
			//	button.className +=" active";
			//	button.click();
		//	}
		//}
		//else if(event.keyCode == 9) {//tab
		 //   if(document.exitPointerLock !== undefined){
		//		document.exitPointerLock();			//unlock the mouse pointer
		//	}
		//	event.preventDefault();
		//}
	});
	document.addEventListener('keyup', function(event) {
	/*	if(event.keyCode == 87) {//w
		    forwardMove =false;
		}
		else if(event.keyCode == 83) {//s
		    backwardMove =false;
		}
		else if(event.keyCode == 65) {//a
		    rightMove =false;
		}
		else if(event.keyCode == 68) {//d
		    leftMove =false;
		}
		else if(event.keyCode >= 49 && event.keyCode <= 54) {
		    var button =document.getElementById('actionButton'+(event.keyCode-48));
			button.className ="actionOverlay";
		}*/
	});

	//var fullscreen = document.getElementById("fullscreen");
	//var fullscreen = document.body;
	//var fullscreen = document;

	//fullscreen.oncontextmenu = function (event) {
    //	event.preventDefault();
	//	return false;
	//};

	//document.body.addEventListener('mousedown', function (event){
	/*document.addEventListener('mousedown', function (event){
		if(event.button === 0){//left mouse

		}
		else if(event.button === 2){// right mouse

		}
		else if(event.button === 1){// middle mouse

		}
	}, false);*/

	//document.body.addEventListener('mouseup', function (event){
	/*document.addEventListener('mouseup', function (event){
		if(event.button === 0){//left mouse
			//console.log("left");
		}
		else if(event.button === 2){// right mouse
			//console.log("right");
		}
		else if(event.button === 1){// middle mouse
			//console.log("middle");
		}
	}, false);*/

	/*try{
		document.addEventListener("mousemove",
		function(event) {
*//*			if(pointerLocked){
				movementX +=event.movementX       ||
							event.mozMovementX    ||
							event.webkitMovementX ||
							0;
				movementY +=event.movementY       ||
							event.mozMovementY    ||
							event.webkitMovementY ||
							0;
			}*//*
			//	console.log(movementX);
			//for (var prop in event) {
			//  console.log(prop + ' = ' + event[prop]);
			// }
			//console.log('\n');
		}, false);
	}
	catch(e){
		return true;
	}*/


	// do nothing in the event handler except canceling the event
	/*fullscreen.ondragstart = function(event) {
		if (event && event.preventDefault) { event.preventDefault(); }
		if (event && event.stopPropagation) { event.stopPropagation(); }
		return false;
	}
	// do nothing in the event handler except canceling the event
	fullscreen.onselectstart = function(event) {
		if (event && event.preventDefault) { event.preventDefault(); }
		if (event && event.stopPropagation) { event.stopPropagation(); }
		return false;
	}*/

	return false;
}