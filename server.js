'use strict';

const { Session } = require('adps-auth');
const BodyParser = require('body-parser');
var express = require('express');
var mysql = require('mysql');
var path = require('path');
var moment = require('moment-timezone');

const { EmailAPI } = require('./email.js');
const { CalendarAPI } = require('./calendar.js');

var app = express();

app.set('trust proxy', 1);

app.use(express.static('public'));

app.use('/', Session);
app.use('/', BodyParser.urlencoded({
	extended: false
}));

var router = express.Router();
EmailAPI(router);
CalendarAPI(router);

//First you need to create a connection to the db
const conn = mysql.createConnection({
  host: process.env.HM_DB_HOST,
  user: process.env.HM_DB_USER,
  password: process.env.HM_DB_PASS,
});

conn.connect((err) => {
  if(err){
  	console.error(err);
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});
conn.query("USE hm");

getMyGroupId("", "");
getGroupMembers(1);
getUpcomingShifts(1);
getCCShifts(1);
getTodayShiftsInfo();
userIdToGuid(1);

// for user side
function getMyGroupId(firstName, lastName) {
	conn.query("SELECT users.id, users.first_name, users.last_name, p.id as pairs_id, p.user_id1, p.user_id2, p.user_id3 FROM users INNER JOIN pairs AS p ON users.id = p.user_id1 OR users.id = p.user_id2 OR users.id = p.user_id3 WHERE users.first_name = ? AND users.last_name = ?", [firstName, lastName], function(error, result, fields) {
		console.log(result);
	});
}

// for user side
function getGroupMembers(groupId) {
	conn.query("SELECT pairs.id, pairs.user_id1, pairs.user_id2, pairs.user_id3, users.first_name, users.last_name FROM pairs, users WHERE pairs.id = ? AND (users.id = pairs.user_id1 OR users.id = pairs.user_id2 OR users.id = pairs.user_id3)", [groupId], 
		function(error, result, fields) {
			console.log(result);
	});
}

// for user side
function getUpcomingShifts(groupId) {
	var dateString = moment().tz('America/New_York').format("YYYY-MM-DD");
	conn.query("SELECT room, size, day, null as start_day, null as end_day FROM cleaningshifts WHERE pair_id = ? AND day > ? UNION SELECT room, null as size, null as day, start_day, end_day FROM ccshifts WHERE pair_id = ? AND start_day > ?", 
		[groupId, dateString, groupId, dateString], function(error, result, fields) {
			console.log(result);
			console.error(error);
	});
}

// for cc email
function getCCShifts(ccId) {
	conn.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.day, " + 
		"cleaningshifts.pair_id, p.user_id1, p.user_id2, p.user_id3 FROM cleaningshifts " + 
		"INNER JOIN pairs AS p ON cleaningshifts.pair_id = p.id WHERE cleaningshifts.cc_id = ?", 
		[ccId], function(error, result, fields) {
			console.log(result);
			//console.error(error);
	});
}

// for reminder email
function getTodayShiftsInfo() {
	var dateString = moment().tz('America/New_York').format("YYYY-MM-DD");
	conn.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.cc_id," + 
		" c.id, c.pair_id, p.user_id1, p.user_id2, p.user_id3 FROM " + 
		"cleaningshifts INNER JOIN ccshifts AS c ON cleaningshifts.cc_id = " + 
		"c.id INNER JOIN pairs AS p on c.pair_id = p.id WHERE day = ?", [dateString], 
		function(error, result, fields) {
			console.log(result);
			console.error(error);
	});
}

function userIdToGuid(userId) {
	conn.query("SELECT id, guid FROM users WHERE id = ?", [userId], function(error, result, fields) {
		console.log(result);
	});
}

function addCleaningShift(cleaningShiftInfo) {
	conn.query("INSERT INTO cleaningshifts (room, size, points, pair_id, day, status) " +
		"VALUES (?, ?, ?, ?, ?, 'ASSIGNED')", [cleaningShiftInfo.room, cleaningShiftInfo.size, 
		cleaningShiftInfo.points, cleaningShiftInfo.pair_id, cleaningShiftInfo.day], 
		function(error, result, fields) {

	});
}

function addCCShift(ccShiftInfo) {
	conn.query("INSERT INTO ccshifts (room, pair_id, start_day, end_day, missed, made_up) " +
		"VALUES (?, ?, ?, ?, 0, 0)", [ccShiftInfo.room, ccShiftInfo.pair_id, 
		ccShiftInfo.start_day, ccShiftInfo.end_day], function(error, result, fields) {
			conn.query("UPDATE cleaningshifts SET cc_id = ? WHERE room = ? AND day >= ? AND " +
				"day <= ?", [ccShiftInfo.cc_id, ccShiftInfo.room, ccShiftInfo.start_day, 
				ccShiftInfo.end_day], function(error, result, fields) {

			});
	});
}

function updateCleaningShiftStatus(status) {

}

/*This route goes to the home page, which allows the user to generate a new chatroom 
	and enter it.*/
router.get('/', function(request, response){
	console.log('- Request received:', request.method, request.url);

	response.sendFile(path.join(__dirname, "./index.html"));
});

app.use('/', router);

/*Sets up the server on port 8080.*/
app.listen(8080, function(){
	console.log('- Server listening on port 8080');
});
