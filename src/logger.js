const config = require('../config');
const winston = require('winston');

let transports = [
	new (winston.transports.File)({
		filename: config.logger.name,
		level: config.logger.level
	})
];
if (config.logger.appendConsole) {
	transports.push(new (winston.transports.Console)({
		level: config.logger.level
	}));
}

const logger = new (winston.Logger)({
	transports: transports
});

module.exports = logger;
