const logger = require('./logger');
const config = require('../config.json');
const rooms = config.rooms;
const numRooms = rooms.length;

let intervalId = null;

module.exports.notifyRooms = function(callRoom) {
	clear();

	room(rooms[0], callRoom);
	let index = 0;

	intervalId = setTimeout(() => {
		index++;
		if (index < numRooms) {
			room(rooms[index], callRoom);
		} else {
			clear();
		}
	}, config.roomDelayMs);
};

function clear() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
}

function room(room, call) {
	logger.debug(room);

	call(room.deviceId, room.roomId);
}
