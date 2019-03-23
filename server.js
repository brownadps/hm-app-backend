'use strict';

const { Session } = require('adps-auth');
const BodyParser = require('body-parser');
var express = require('express');

const { API } = require('./api.js');
const { CalendarAPI } = require('./calendar.js');
const { EmailAPI } = require('./email.js');

const { Database } = require('./db.js');

var app = express();

app.set('trust proxy', 1);

app.use(express.static('public'));

app.use('/', Session);
app.use('/', BodyParser.urlencoded({
	extended: false
}));

// First initalize the connection to the db
const db = new Database({
	host: process.env.HM_DB_HOST,
	user: process.env.HM_DB_USER,
	password: process.env.HM_DB_PASS,
});

var router = express.Router();
API(router, { db });
EmailAPI(router);
CalendarAPI(router);

// getMyGroupId("", "");
// getGroupMembers(1);
// getUpcomingShifts(1);
// getCCShifts(1);
// getTodayShiftsInfo();
// userIdToGuid(1);

app.use('/', router);

/*Sets up the server on port 8080.*/
app.listen(8080, function(){
	console.log('- Server listening on port 8080');
});
