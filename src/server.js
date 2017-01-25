const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');
const logger = require('./logger');
const config = require('../config');
const twiml = new twilio.TwimlResponse();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

module.exports.start = function(cb) {
	app.post('/', function (request, response) {
		// Do some logic to make sure Notify is contacting you
		cb(request.body.Body);

		response.writeHead(200, {'Content-Type': 'text/xml'});
		response.end(twiml.toString());
	});

	app.listen(config.server.port, () => logger.info('server running on port ', config.server.port));
};

module.exports.stop = function() {
	app.close();
};
