'use strict';

const { Session } = require('adps-auth');
const BodyParser = require('body-parser');
var express = require('express');
const fs = require('fs');
const ServeIndex = require('serve-index');

const { API } = require('./api.js');
const { CalendarAPI } = require('./calendar.js');
const { EmailAPI } = require('./email.js');

const { Database } = require('./db.js');

var app = express();

app.set('trust proxy', 1);

app.use(express.static('public'));
app.use('/uploads', (req, res, next) => {
	if (req.originalUrl === '/uploads') {
		req.originalUrl = '/hm/api' + req.originalUrl;
	}
	next();
});
app.get('/uploads/list', (req, res) => {
	fs.readdir(process.env.HM_FILE_UPLOAD_PATH, function(err, items) {
		res.send(items);
	});
});
app.use('/uploads', ServeIndex(process.env.HM_FILE_UPLOAD_PATH));
app.use('/uploads', express.static(process.env.HM_FILE_UPLOAD_PATH));


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

app.use('/', router);

app.listen(8080, function(){
	console.log('Server listening on port 8080');
});
