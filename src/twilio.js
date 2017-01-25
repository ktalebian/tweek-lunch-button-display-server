const twilio = require('twilio');
const credentials = require('../credentials');
const config = require('../config');
const util = require('util');

const client = new twilio.RestClient(credentials.twilio.accountSid, credentials.twilio.authToken);

module.exports.register = function(cb) {
	const body = util.format('%s: sms', config.twilio.name);

	module.exports.send(config.twilio.toNumber, body, cb);
};

module.exports.send = function(to, body, cb) {
	client.messages.create({
		body: body,
		to: to,
		from: config.twilio.fromNumber,
	}, cb);
};
