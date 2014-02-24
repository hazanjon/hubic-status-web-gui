var express = require('express');
var sys = require('sys')
var exec = require('child_process').exec;
var env = process.env;

//TODO: be able to pass in a custom BUS_ADDRESS

var app = express();

var status = {};

//dbus-daemon --print-address --session
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
/*

var dbus = {
	sessionAddress: process.env.DBUS_SESSION_BUS_ADDRESS,
	exported: false
};
dbus.exportSessionAddress = function(){
	var self = this;
	exec("export " + self.sessionAddress, function (error, stdout, stderr) {
		console.log('Out:', stdout);

		console.log('Error:', stderr);
		self.exported = true;
		return true;
	});
};
dbus.getSessionAddress = function(){
	var self = this;
	
	exec("echo $DBUS_SESSION_BUS_ADDRESS", function (error, stdout, stderr) {
		console.log('Error:', stderr);
	console.log('match');
		var matches = stdout.match(/DBUS_SESSION_BUS_ADDRESS='unix:abstract=\/tmp\/dbus-([\w]+),guid=([\w]+)'/);
		
			console.log(matches[0]);
		if(matches.length > 0){
			self.sessionAddress = matches[0];
			self.exportSessionAddress();
			return true;	
		}
		
		return false;
	});
};
dbus.launch = function(){
	var self = this;
	console.log('getadd');
	exec("eval `dbus-launch --sh-syntax`", function (error, stdout, stderr) {
		console.log('Error:', stderr);
	});
};*/

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
		speed: {
			upload: 0,
			download: 0	
		},
		queue: {
			upload: {
				count: 0,
				size: '',
				running: 0	
			},
			download: {
				count: 0,
				size: '',
				running: 0	
			},
			misc: {
				count: 0,
				size: '',
				running: 0	
			}
		},
		operations: {
			upload: [
			/*
			{
				dir: '',
				file: '',
				progress: '',
				size: ''
			}
			*/
			],
			download: [],
			misc: []
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
	hubic.status.speed.upload = parseSingle(/Up: ([0-9\.]+ [KMG]?B\/s)/);
	hubic.status.speed.download = parseSingle(/Down: ([0-9\.]+ [KMG]?B\/s)/);
	hubic.status.syncDir = parseSingle(/Synchronized directory: (.+)\n/);
	hubic.status.spaceUsed = parseSingle(/Usage: ([0-9\.]+ [KMG]B)/);
	hubic.status.maxSpace = parseSingle(/Usage: [0-9\.]+ [KMG]?B\/([\-0-9\.]+ [KMG]?B)/);
	hubic.status.maxSpace = parseSingle(/Usage: [0-9\.]+ [KMG]?B\/([\-0-9\.]+ [KMG]?B)/);
	
	hubic.status.queue.upload.count = parseSingle(/Uploads: ([0-9]+)/);
	hubic.status.queue.upload.size = parseSingle(/Uploads: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.queue.upload.running = parseSingle(/Uploads: .+\+ ([0-9]+) running/);
	
	hubic.status.queue.download.count = parseSingle(/Downloads: ([0-9]+)/);
	hubic.status.queue.download.size = parseSingle(/Downloads: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.queue.download.running = parseSingle(/Downloads: .+\+ ([0-9]+) running/);
	
	hubic.status.queue.misc.count = parseSingle(/Misc: ([0-9]+)/);
	hubic.status.queue.misc.size = parseSingle(/Misc: [0-9]+ \(([0-9\.]+ [KMG]?B)\)/);
	hubic.status.queue.misc.running = parseSingle(/Misc: .+\+ ([0-9]+) running/);
	
	//console.log(stdout);
	console.log(hubic.status);
	
	
	/*
	State: Busy
	Up: 1.1 MB/s (0 B/s)    Down: 0 B/s (0 B/s)

	Account: hazanjon@hotmail.com
	Synchronized directory: /media/angel/
	Usage: 140.84 GB/-1 B

	Queue:
	        Uploads: 539 (859.83 GB) + 3 running
	        Downloads: 0 (0 B) + 0 running
	        Misc: 0 + 0 running

	Running operations:
	        Upload for /media/angel/Films/Dead_Snow (2009)/deadsnow1080-cls.mkv (899.78 MB/7.95 GB)
	        Upload for /media/angel/Films/USS Seaviper (2012).m4v (278.5 MB/599.72 MB)
	        Upload for /media/angel/Films/Pirates-Of-The-Caribbean-At-Worlds-End-2007.mkv (549.78 MB/599.66 MB)

	Last events:
	        [24/02/2014 00:21:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 00:31:40|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 00:41:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 00:51:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:01:40|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:11:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:21:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:31:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:41:40|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	        [24/02/2014 01:51:41|Warning] Can not synchronise /media/angel/: Stale NFS file handle [ESTALE].. Will retry later.
	*/
}




setInterval(hubic.getStatus, 2000);

app.get('/', function(req, res){
	res.send('Hello World');
	console.log('Show page');
});

app.listen(3030);