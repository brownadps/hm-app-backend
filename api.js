'use strict';

const { google } = require('googleapis');
const path = require('path');

const { Auth } = require('adps-auth');
const { actions } = require('./db.js');
const { Upload } = require('./storage.js');

function UserAPI(router, options) {
    const db = options.db;

    router.post('/user', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const token = await oauth2Client.getAccessTokenAsync();
            const tokeninfo = await oauth2Client.getTokenInfo(token.token);
            const guid = tokeninfo.sub;
            const userId = await actions.guidToUserId(db, guid);
            const isHM = await actions.isHMByUserId(db, userId);
            if (!isHM) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must be an HM to create new users."
                    }
                }));
            };
            const email = req.body.email;
            if (!email) {
                throw new Error(JSON.stringify({
                    status: 404,
                    data: {
                        message: "Must supply new user email."
                    }
                }));
            }
            const data = await actions.upsertUserByEmail(db, email);
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.put('/user', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const token = await oauth2Client.getAccessTokenAsync();
            const tokeninfo = await oauth2Client.getTokenInfo(token.token);
            let guid = tokeninfo.sub;
            const userId = await actions.guidToUserId(db, guid);
            if (!isHM) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must be an HM to create new users."
                    }
                }));
            };
            const user = await actions.getUserById(db, userId);
            const first_name = req.params.first_name || user.first_name;
            const last_name = req.params.last_name || user.last_name;
            const email = req.params.email || user.email;
            const is_hm = req.params.is_hm || user.is_hm;
            guid = user.guid; // This should not be updated.
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.get('/user/:userId', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const userId = req.params.userId;
            const data = await actions.getUserById(db, userId);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });
}

function GroupAPI(router, options) {
    const db = options.db;

    router.get('/group', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const groupIds = await actions.getGroupIds(db);
            const data = groupIds.map(elm => {
                return {
                    id: elm.id,
                    uri: `/group/` + elm.id 
                }
            });
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.get('/group/:groupId', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const groupId = req.params.groupId;
            const data = await actions.getGroupById(db, groupId);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });
    
    router.get('/group/user/me', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const token = await oauth2Client.getAccessTokenAsync();
            const tokeninfo = await oauth2Client.getTokenInfo(token.token);
            const guid = tokeninfo.sub;
            const userId = await actions.guidToUserId(db, guid);
            const data = await actions.getGroupByUserId(db, userId);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err);
            return res.status(err.status).send(err);
        }
    });

    router.get('/group/user/:userId', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const userId = req.params.userId;
            const data = await actions.getGroupByUserId(db, userId);
            return res.send(data);
        } catch (err) {
            console.error(err);
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });
}

function PairAPI(router, options) {
    const db = options.db;

    router.post('/pair', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const userIds = req.body.userIds;
            if (!Array.isArray(userIds) || userIds.length < 2 || userIds.length > 3) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must supply 2 or 3 user ids."
                    }
                }));
            }
            const data = await actions.createGroup(db, userIds);
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });
}

function CleaningShiftAPI(router, options) {
    const db = options.db;

    router.post('/shift', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const shiftInfo = req.body;
            if (!shiftInfo) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must supply info for shift."
                    }
                }));
            }
            const data = await actions.createShift(db, shiftInfo);
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.post('/ccshift', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const ccShiftInfo = req.body;
            if (!ccShiftInfo) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must supply info for shift."
                    }
                }));
            }
            const data = await actions.createCCShift(db, ccShiftInfo);
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.get('/shift/:date', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const date = req.params.date;
            const data = await actions.getShiftsAfterDate(db, date);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.get('/shift/:date/group/:groupId', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const date = req.params.date;
            const groupId = req.params.groupId;
            const data = await actions.getShiftsAfterDateByGroup(db, date, groupId);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.post('/shift/status', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const shiftId = req.body.shiftId;
            const status = req.body.status;
            if (!shiftId || !status) {
                throw new Error(JSON.stringify({
                    status: 403,
                    data: {
                        message: "Must supply shift id and new status."
                    }
                }));
            }
            const data = await actions.updateShiftStatus(db, shiftId, status);
            res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });

    router.post('/shift/upload', Upload.array('photos'), async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
        
        res.send({
            status: 201,
            filenames: req.files.map(file => file.filename),
        });
    });
}

function EmailAPI(router, options) {
    const db = options.db;

    router.get('/email/:date', async (req, res) => {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }
   
        try {
            const date = req.params.date;
            const data = await actions.getEmailDatebyDate(db, date);
            return res.send(data);
        } catch (err) {
            err = JSON.parse(err.message);
            return res.status(err.status).send(err);
        }
    });
}

function API(router, options) {
    const db = options.db;

    router.get('/', async function(req, res) {
        const oauth2Client = Auth.authenticate(req);
        if (oauth2Client === null) {
            return res.status(302).set('Location', '/').send();
        }

        try {
            const token = await oauth2Client.getAccessTokenAsync();
            const tokeninfo = await oauth2Client.getTokenInfo(token.token);
            const guid = tokeninfo.sub;
            const response = await google.oauth2('v2').userinfo.get({
                auth: oauth2Client
            });
            const person = response.data;
            await actions.upsertUserByEmail(db, person.email, person.given_name, person.family_name, guid);
            return res.sendFile(path.join(__dirname, "./index.html"));
        } catch (err) {
            err = JSON.parse(err);
            return res.status(err.status).send(err);
        }       
    });

    UserAPI(router, options);
    GroupAPI(router, options);
    PairAPI(router, options); 
    CleaningShiftAPI(router, options);   
    EmailAPI(router, options);   
}

module.exports = {
    API: API
}