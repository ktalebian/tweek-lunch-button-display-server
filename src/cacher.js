const jsonfile = require('jsonfile');
const config = require('../config.json');
const logger = require('./logger');

let cache = {};
let lastSystemOnline = {};
let lastCache = {};

module.exports.start = start;
module.exports.cache = cache;
module.exports.lastSystemOnline = lastSystemOnline;
module.exports.lastCache = lastCache;

function start() {
	readFromFile();

	setInterval(() => {
		logger.debug("Cache: ", module.exports.cache);
		writeToFile();
	}, config.cache.loopIntervalMs);
}

function readFromFile() {
	const json = jsonfile.readFileSync(config.cache.storagePath);
	module.exports.cache = {};
	module.exports.lastSystemOnline = {};
	module.exports.lastCache = {};
	Object.keys(json).forEach(id => {
		module.exports.cache[id] = json[id].cache;
		module.exports.lastSystemOnline[id] = json[id].lastSystemOnline;
		module.exports.lastCache[id] = json[id].lastCache;
	});
}

function writeToFile() {
	let data = {};

	Object.keys(module.exports.cache).forEach(id => {
		data[id] = {
			cache: module.exports.cache[id],
			lastSystemOnline: module.exports.lastSystemOnline[id],
			lastCache: module.exports.lastCache[id]
		}
	});
	jsonfile.writeFileSync(config.cache.storagePath, data);
}

