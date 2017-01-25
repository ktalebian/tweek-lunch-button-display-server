const server = require('./src/server');
const particle = require('./src/particle');
const display = require('./src/display');
const twilio = require('./src/twilio');
const logger = require('./src/logger');
const config = require('./config.json');
const _ = require('lodash');

twilio.register((err, data) => {
	if (err) {
		return logger.error("Could not bind to notification ", err);
	}

	particle.start((err, actions) => {
		if (err) {
			return logger.error("Could not login to Particle: ", err);
		}

		server.start((message) => {
			const array = message.split(":");

			if (array.length < 2) {
				return;
			}

			// These are commands to program the device
			const device = array[0].toLowerCase();
			const command = _.camelCase(array[1]);
			if (command === "lunch") {
				return particle.callRoom(device);
			}

			if (array.length < 3) {
				return;
			}

			const value = array[2].toLowerCase();

			if (command === "light") {
				value === "on" && particle.lightOn(device);
				value === "off" && particle.lightOff(device);
			} else {
				const method = "set" + command.charAt(0).toUpperCase() + command.substring(1);
				if (particle[method]) {
					particle[method](device, value);
				}
			}
		});
	});
});


