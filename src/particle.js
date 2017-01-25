const Particle = require('particle-api-js');
const logger = require('./logger');
const particle = new Particle();
const credentials = require('../credentials.json');
let cacher = require('./cacher');

let token = null;

module.exports.start = start;
module.exports.setRoom = setRoom;
module.exports.setFirstCall = setFirstCall;
module.exports.setSecondCall = setSecondCall;
module.exports.setDelay = setDelay;
module.exports.lightOn = lightOn;
module.exports.lightOff = lightOff;
module.exports.callRoom = callRoom;
module.exports.devices = credentials.devices;


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
	const arg = "room:" + roomId;
	programDevice(device, arg);
}

function setFirstCall (device, duration) {
	const d = parseFloat(duration);
	if (isNaN(d)) {
		return logger.warn("Invalid duration %s provided", duration);
	}

	const arg = "firstCall:" + d;
	programDevice(device, arg);
}

function setSecondCall (device, duration) {
	const d = parseFloat(duration);
	if (isNaN(d)) {
		return logger.warn("Invalid duration %s provided", duration);
	}

	const arg = "secondCall:" + d;
	programDevice(device, arg);
}

function setDelay (device, duration) {
	const d = parseFloat(duration);
	if (isNaN(d)) {
		return logger.warn("Invalid duration %s provided", duration);
	}

	const arg = "delay:" + d;
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
						} else if (command === "f") {
							setFirstCall(id, value/(60*1000));
						} else if (command === "s") {
							setSecondCall(id, value/(60*1000));
						} else if (command === "d") {
							setDelay(id, value/(60*1000));
						}
					});
					programDevice(id, "rebootComplete:true");

				}
			}
		});
	});
}

function getDataByKey(metaData, key) {
	let result = null;
	metaData.forEach(data => {
		const arr = data.split(':');
		const command = arr[0];
		const value = arr[1];

		if (command == key) {
			result = value;
		}
	});

	return result;
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
		if (getDataByKey(data, 'r') === deviceId) {
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

	return getDataByKey(cacher.cache[id], 'r');
}