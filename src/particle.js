const Particle = require('particle-api-js');
const logger = require('./logger');
const particle = new Particle();
const request = require('superagent');
const credentials = require('../credentials.json');
const config = require('../config.json');
let cacher = require('./cacher');

let token = null;

module.exports.start = start;
module.exports.setRoom = setRoom;
module.exports.setDuration = setDuration;
module.exports.lightOn = lightOn;
module.exports.lightOff = lightOff;
module.exports.callRoom = callRoom;
module.exports.devices = credentials.devices;
module.exports.programDevice = programDevice;


function start (cb) {
	cacher.start();
	particle.login({
		username: credentials.particle.username,
		password: credentials.particle.password,
	}).then((data) => {
		token = data.body.access_token;
		recoverySystem();

		cb(null, {
			callRoom: callRoom,
			programDevice: programDevice
		});
	}, (err) => {
		cb(err, null);
	});
}

function setRoom (device, roomId) {
	const oldRoom = getRoomId(device);
	const arg = "room:" + roomId;
	programDevice(device, arg);
	let payload = {
		newRoom: roomId
	};
	if (oldRoom !== roomId && oldRoom) {
		payload.oldRoom = oldRoom
	}
	request
		.post(config.notifyServer + '/display', payload)
		.end();
}

function setDuration (device, duration) {
	const d = parseFloat(duration);
	if (isNaN(d)) {
		return logger.warn("Invalid duration %s provided", duration);
	}

	const arg = "duration:" + d;
	programDevice(device, arg);
}

function lightOn (device) {
	programDevice(device, "light:on");
}

function lightOff (device) {
	programDevice(device, "light:off");
}

function callRoom (roomId) {
	const id = getUniqueDeviceId(roomId);
	if (id) {
		callFunction(id, id, 'food');
	}
}

function programDevice (deviceId, arg) {
	callFunction(deviceId, arg, 'program');
}

function callFunction (deviceId, arg, name) {
	deviceId = getUniqueDeviceId(deviceId) || deviceId;

	logger.info("[%s][%s] Sending Command %s", deviceId, name, arg);

	particle.callFunction({
		deviceId: deviceId,
		name: name,
		argument: arg,
		auth: token
	}).then((data) => {
		// no-op
	}, (err) => {
		logger.error(err);
	});
}

function recoverySystem () {
	particle.getEventStream({
		auth: token,
		name: 'metaData'
	}).then((stream) => {
		stream.on('event', (payload) => {
			const id = payload.coreid;
			const ts = new Date(payload.published_at).getTime();

			if (!cacher.lastCache[id]) {
				cacher.lastCache[id] = ts;
			}

			if (ts >= cacher.lastCache[id]) {
				cacher.lastCache[id]++;
				cacher.cache[id] = payload.data.split(',');
			}
		});
	});

	particle.getEventStream({
		auth: token,
		name: 'systemOnline'
	}).then((stream) => {
		stream.on('event', (payload) => {
			const id = payload.coreid;
			const ts = new Date(payload.published_at).getTime();
			const metaData = cacher.cache[id];
			if (metaData) {
				if (!cacher.lastSystemOnline[id]) {
					cacher.lastSystemOnline[id] = ts;
				}

				if (ts >= cacher.lastSystemOnline[id]) {
					cacher.lastSystemOnline[id]++;
					logger.info("[%s] Recovering from cache: %s", id, metaData);

					metaData.forEach(data => {
						const arr = data.split(':');
						const command = arr[0];
						const value = arr[1];

						if (command === "r") {
							setRoom(id, value);
						} else if (command === "d") {
							setDuration(id, value/(60*1000));
						}
					});
					programDevice(id, "rebootComplete:true");

				}
			}
		});
	});
}

function getUniqueDeviceId(deviceId) {
	// This is the name set in Console (like "cheat", "bob", ...)
	if (deviceId in credentials.devices) {
		return credentials.devices[deviceId];
	}

	// Let's see if this is the "room" name
	for (const id in cacher.cache) {
		// skip loop if the property is from prototype
		if (!cacher.cache.hasOwnProperty(id)) continue;

		const data = cacher.cache[id];
		if (cacher.getDataByKey(data, 'r') === deviceId) {
			return id;
		}
	}

	return false;
}

function getRoomId(id) {
	// This will convert everything to unique id
	id = getUniqueDeviceId(id);
	if (!id) {
		return false;
	}

	return cacher.getDataByKey(cacher.cache[id], 'r');
}