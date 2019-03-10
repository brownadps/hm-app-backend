'use strict';

const { google } = require('googleapis');
const { Auth } = require('adps-auth');

async function createEvent(oauth2Client, options) {
    const gcal = google.calendar({
        version: 'v3',
        auth: oauth2Client
    });

    const calendarId = options.calendarId;
    const date = options.date;
    const rawAttendees = options.attendees;
    const attendees = rawAttendees.map(e => {
        return {
            email: e
        };
    });
    const summary = options.summary;

    try {
        return await gcal.events.insert({
            calendarId: calendarId, 
            sendUpdates: 'all',
            resource: {
                end: { date },
                start: { date },
                attendees: attendees,
                summary: summary,
            }
        });
    } catch (err) {
        console.error(err);
        return;
    }
}

function CalendarAPI(router) {
    router.get('/event', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            var cal2 = await createEvent(oauth2Client, {
                calendarId: '',
                date: '2019-03-12',
                attendees: ['', ''],
                summary: 'Kitchen Shift (big)',
            });
            console.log(cal2);
        } catch (err) {
            console.error(err);
        }
    
        return res.json(cal2);
    });
}

module.exports = {
    CalendarAPI: CalendarAPI
}
