'use strict';

const { google } = require('googleapis');
const { Auth } = require('adps-auth');

async function sendReminderEmail(oauth2Client, options) {
    const shiftEmails = options.people.shift.emails || [];
    const shiftNames = options.people.shift.names || [];
    const ccEmails = options.people.cc.emails || [];
    const ccNames = options.people.cc.names || [];
    const hmEmail = options.people.hm.email;
    const room = options.shift.room;
    const size = options.shift.size;
    const date = options.shift.date;

    let ccNamesStr;
    if (ccNames.length == 2) {
        ccNamesStr = ccNames[0] + ' and ' + ccNames[1];
    } else {
        let shortenedNames = ccNames.slice(0, -1);
        ccNamesStr = shortenedNames.join(', ');
        ccNamesStr += ', and ' + ccNames[ccNames.length - 1];
    }

    const body = 'Hello!<br><br>' +     
    `This is a reminder that you have a ${room} (${size}) shift tomorrow.<br><br>` + 
    `After completing your shift, please inform ${ccNamesStr}, your Cleaning Coordinators, and use the app to send the HMs a picture.`;

    const preparedOptions = {
        to: shiftEmails,
        cc: ccEmails,
        from: hmEmail,
        subject: `Cleaning Shift Reminder: ${room} (${size})`,
        body: body
    }

    return await sendEmail(oauth2Client, preparedOptions);
}

async function sendShiftCompletedEmail() {

}

async function sendEmail(oauth2Client, options) {
    const gmail = google.gmail({
        version: 'v1',
        auth: oauth2Client
    });

    const to = options.to.join(' ,') || 'noreply@example.com';
    const cc = options.cc.join(' ,') || 'noreply@example.com';
    const from = options.from || 'noreply@example.com';
    const contentType = 'text/html; charset=utf-8';
    const mime = '1.0';
    const subject = options.subject || '(no subject)';
    const body = options.body;

    const rawMessage = [
        'From ' + from,
        'To: ' + to,
        'CC: ' + cc,
        'Content-Type: ' + contentType,
        'MIME-Version: ' + mime,
        'Subject: ' + subject,
        '',
        body
    ];
    const message = rawMessage.join('\n');
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        return await gmail.users.messages.send({
            userId: 'me',
            resource: {
                raw: encodedMessage
            }
        });
    } catch (err) {
        console.error(err);
        return;
    }
}

function EmailAPI(router) {
    router.get('/test', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            await sendReminderEmail(oauth2Client, {
                people: {
                    shift: {
                        emails: [
                            ''
                        ],
                        names: [
                            ''
                        ]
                    },
                    cc: {
                        emails: [
                            '',
                            ''
                        ],
                        names: [
                            '',
                            ''
                        ]
                    },
                    hm: {
                        email: ''
                    }
                },
                shift: {
                    room: 'Pine Room',
                    size: 'big',
                    date: '2019-03-12'
                }
            });
        } catch (err) {
            console.error(err);
        }
    
        return res.send("success");
    });
}

module.exports = {
    EmailAPI: EmailAPI
}
