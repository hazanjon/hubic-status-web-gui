//Required
var config = require('./config.json');
var express = require('express');
var sys = require('sys')
var exec = require('child_process').exec;
var env = process.env;
var Pusher = require('pusher');

//Config
var pusher = new Pusher(config.pusher);
var app = express();

//TODO: be able to pass in a custom BUS_ADDRESS

var status = {};

var dbusLaunchInProgress = false;
var dbusLaunch = function(){
	var self = this;
	if(!dbusLaunchInProgress){
		console.log('Starting dbus');
		dbusLaunchInProgress = true;
		exec("eval `dbus-launch --sh-syntax`", {env: env}, function (error, stdout, stderr) {
			console.log(env);
			exec("echo $DBUS_SESSION_BUS_ADDRESS", {env: env}, function (error, stdout, stderr) {
			console.log(env);
				console.log('db', stdout);
			});
			console.log(stdout);
			console.log(stderr);
			console.log('dbus started: ', env.DBUS_SESSION_BUS_ADDRESS);
		});
		
	}
};

var hubicErrorHandling = [
	{
		errorMessage: "Cannot contact daemon, are you sure it is running?\n",
		response: dbusLaunch
	}
];

var getError = function(error){
	for(i = 0; i < hubicErrorHandling.length; i++){
		if(hubicErrorHandling[i].errorMessage == error){
			if(hubicErrorHandling[i].response()){
				return true;
			}
		}
	}
	
	console.log("Unknown Error Occured: '" + error + "'");
	//TODO: Quit out here
	return false;
}

var hubic = {
	status: {
		spaceUsed: '',
		maxSpace: '',
		account: '',
		syncDir: '',
		state: '',
		upload: {
			speed: 0,
			queue: {
				count: 0,
				size: '',
				running: 0	
			},
			operations:[
				/*
				{
					dir: '',
					file: '',
					progress: '',
					size: ''
				}
				*/
			]
		},
		download: {
			speed: 0,
			queue: {
				count: 0,
				size: '',
				running: 0	
			},
			operations:[]
		},
		misc: {
			speed: 0,
			queue: {
				count: 0,
				size: '',
				running: 0	
			},
			operations:[]
		},
		events: [
			/*
			{
				date: Date(),
				type: '',
				message: ''
			}
			*/
		]
	}
};
hubic.getStatus = function(){
	console.log('Update Status');
	if(process.env.DBUS_SESSION_BUS_ADDRESS){
		exec("hubic status", hubic.parseStatus);
	}else{
		console.log('DBUS_SESSION_BUS_ADDRESS not set');
		dbusLaunch();
	}
}
hubic.parseStatus = function(error, stdout, stderr){
	var parseSingle = function(regex, statusProp){
		var matches = stdout.match(regex);
		//console.log(matches);
		if(matches){
			return matches[1];
		}
		return null;
	}
	
	hubic.status.state = parseSingle(/State: ([\w]+)/);
	hubic.status.account = parseSingle(/Account: ([\w@]+)/);
	hubic.status.syncDir = parseSingle(/Synchronized directory: (.+)\n/);
	hubic.status.spaceUsed = parseSingle(/Usage: ([0-9\.]+ [KMG]B)/);
	hubic.status.maxSpace = parseSingle(/Usage: [0-9\.]+ [KMG]?B\/([\-0-9\.]+ [KMG]?B)/);
	hubic.status.maxSpace = parseSingle(/Usage: [0-9\.]+ [KMG]?B\/([\-0-9\.]+ [KMG]?B)/);
	
	hubic.status.upload.speed = parseSingle(/Up: ([0-9\.]+ [KMG]?B\/s)/);
	hubic.status.upload.queue.count = parseSingle(/Uploads: ([0-9]+)/);
	hubic.status.upload.queue.size = parseSingle(/Uploads: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.upload.queue.running = parseSingle(/Uploads: .+\+ ([0-9]+) running/);
	
	hubic.status.download.speed = parseSingle(/Down: ([0-9\.]+ [KMG]?B\/s)/);
	hubic.status.download.queue.count = parseSingle(/Downloads: ([0-9]+)/);
	hubic.status.download.queue.size = parseSingle(/Downloads: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.download.queue.running = parseSingle(/Downloads: .+\+ ([0-9]+) running/);
	
	hubic.status.misc.queue.count = parseSingle(/Misc: ([0-9]+)/);
	hubic.status.misc.queue.size = parseSingle(/Misc: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.misc.queue.running = parseSingle(/Misc: .+\+ ([0-9]+) running/);
	
	var operationregex = /(Upload|Download|Misc) for (.*\/)([^\/]*) \(([0-9\.]+ [KMG]?B)\/([0-9\.]+ [KMG]?B)\)/g;
	var opmatchs;
	while (opmatchs = operationregex.exec(stdout)){	
		var opgroup = hubic.status[opmatchs[1].toLowerCase()].operations;
		
		var found = false;
	    for(var i = 0; i < opgroup.length; i++) {
	        if (opgroup[i].dir == opmatchs[2] && opgroup[i].file == opmatchs[3]){
	        	opgroup[i].progress = opmatchs[4];
	        	found = true;
	        	break;
	        }
	    }
	    
	    if(!found)
			opgroup.push({
				dir: opmatchs[2],
				file: opmatchs[3],
				progress: opmatchs[4],
				size: opmatchs[5]
			});
	}
	
	console.log(hubic.status);
	
	hubic.pushStatus();
}

hubic.pushStatus = function(){
	pusher.trigger('status_channel', 'status_update', hubic.status);
}

setInterval(hubic.getStatus, 2000);

//Web Interface

app.configure(function(){
  app.use(express.static(__dirname + '/public'));
});

app.listen(3030);
