'use strict';

var moment = require('moment-timezone');
var mysql = require('mysql');

class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);
        this.connection.connect((err) => {
            if (err){
                console.error(err);
                console.log('Error connecting to database');
                return;
            }
            console.log('Connection established');
        });
        this.connection.query("USE hm");
    }

    getConnection() {
        return this.connection;
    }

    async query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, results, fields) => {
                if (err)
                    return reject(err);
                resolve(results, fields);
            });
        });
    }
    close() {
        return new Promise((resolve, reject) => {
            this.connection.end(err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    }
}

const userActions = {
    getUserById: async function(db, userId) {
        let results;
        try {
            results = await db.query("SELECT id, first_name, last_name, guid, email, is_hm FROM users WHERE id = ?", [userId]);
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!results || results.length < 1) {
            console.error(`userId ${userId} is not in database.`);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: "No user with supplied guid."
                }
            }));
        }
        return results[0];
    },
    userIdToGuid: async function(db, userId) {
        let results;
        try {
            results = await db.query("SELECT guid FROM users WHERE id = ?", [userId]);
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!results || results.length < 1) {
            console.error(`userId ${userId} is not in database.`);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: "No user with supplied guid."
                }
            }));
        }
        return results[0].guid;
    },
    /** @TODO aysnc/await this */
    guidToUserId: function(db, guid) {
        return new Promise((resolve, reject) => {
            db.query("SELECT id FROM users WHERE guid = ?", [guid])
            .then((results, fields) => {
                if (results.length < 1) {
                    console.error(guid + " is not in database.");
                    reject(JSON.stringify({
                        status: 500,
                        data: {
                            message: "No user with supplied guid."
                        }
                    }));
                }
                resolve(results[0].id);
            })
            .catch(err => {
                console.error(err);
                reject({
                    status: 500,
                    data: {
                        message: 'Oops! There was an error.'
                    }
                });
            });
        });
    },
    isHMByUserId: async function(db, userId) {
        let results;
        try {
            results = await db.query("SELECT is_hm FROM users WHERE id = ?", [userId]);
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!results || results.length < 1) {
            console.error(`userId ${userId} is not in database.`);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: "No user with supplied id."
                }
            }));
        }
        return results[0].is_hm !== 0;
    },
    upsertUserByEmail: async function(db, email, firstName, lastName, guid) {
        try {
            const results = await db.query("INSERT INTO users (first_name, last_name, guid, email) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE first_name = ?, last_name = ?, guid = ?, email = ?", [firstName, lastName, guid, email, firstName, lastName, guid, email]);
            return {
                status: 200,
                data: {
                    message: 'Success.',
                    id: results.insertId
                }
            };
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
    },
}

const groupActions = {
    getGroupIds: async function(db) {
        let results;
        try {
            results = await db.query("SELECT id FROM pairs");
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!Array.isArray(results)) {
            console.error(results);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: "Oops. There was an error"
                }
            }));
        }
        return results;
    },
    getGroupById: async function(db, groupId) {
        let results;
        try {
            results = await db.query("SELECT id, user_id1, user_id2, user_id3 FROM pairs WHERE id = ?", [groupId]);
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!results || results.length < 1) {
            console.error(`groupId ${groupId} is not in database.`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "Group ID not found."
                }
            }));
        }
        return results[0];
    },
    getGroupByUserId: async function(db, userId) {
        let results;
        try {
            results = await db.query("SELECT p.id as pairs_id, p.user_id1, p.user_id2, p.user_id3 FROM users INNER JOIN pairs AS p ON users.id = p.user_id1 OR users.id = p.user_id2 OR users.id = p.user_id3 WHERE users.id = ?", [userId]);
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!results || results.length < 1) {
            console.error(`userId ${userId} is not in database.`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "User ID not found or is not in a pair."
                }
            }));
        }
        return results[0];
    }
}

const otherActions = {
    getGroupMembers: function(conn, groupId) {
        conn.query("SELECT pairs.id, pairs.user_id1, pairs.user_id2, pairs.user_id3, users.first_name, users.last_name FROM pairs, users WHERE pairs.id = ? AND (users.id = pairs.user_id1 OR users.id = pairs.user_id2 OR users.id = pairs.user_id3)", [groupId], 
            function(error, result, fields) {
                console.log(result);
        });
    },
    getUpcomingShifts: function(conn, groupId) {
        var dateString = moment().tz('America/New_York').format("YYYY-MM-DD");
        conn.query("SELECT room, size, day, null as start_day, null as end_day FROM cleaningshifts WHERE pair_id = ? AND day > ? UNION SELECT room, null as size, null as day, start_day, end_day FROM ccshifts WHERE pair_id = ? AND start_day > ?", 
            [groupId, dateString, groupId, dateString], function(error, result, fields) {
                console.log(result);
                console.error(error);
        });
    },
    getCCShifts: function(conn, ccId) {
        conn.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.day, " + 
            "cleaningshifts.pair_id, p.user_id1, p.user_id2, p.user_id3 FROM cleaningshifts " + 
            "INNER JOIN pairs AS p ON cleaningshifts.pair_id = p.id WHERE cleaningshifts.cc_id = ?", 
            [ccId], function(error, result, fields) {
                console.log(result);
                //console.error(error);
        });
    },
    // for reminder email
    getTodayShiftsInfo: function(conn) {
        var dateString = moment().tz('America/New_York').format("YYYY-MM-DD");
        conn.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.cc_id," + 
            " c.id, c.pair_id, p.user_id1, p.user_id2, p.user_id3 FROM " + 
            "cleaningshifts INNER JOIN ccshifts AS c ON cleaningshifts.cc_id = " + 
            "c.id INNER JOIN pairs AS p on c.pair_id = p.id WHERE day = ?", [dateString], 
            function(error, result, fields) {
                console.log(result);
                console.error(error);
        });
    },
    
    addCleaningShift: function(conn, cleaningShiftInfo) {
        conn.query("INSERT INTO cleaningshifts (room, size, points, pair_id, day, status) " +
            "VALUES (?, ?, ?, ?, ?, 'ASSIGNED')", [cleaningShiftInfo.room, cleaningShiftInfo.size, 
            cleaningShiftInfo.points, cleaningShiftInfo.pair_id, cleaningShiftInfo.day], 
            function(error, result, fields) {
    
        });
    },
    addCCShift: function(conn, ccShiftInfo) {
        conn.query("INSERT INTO ccshifts (room, pair_id, start_day, end_day, missed, made_up) " +
            "VALUES (?, ?, ?, ?, 0, 0)", [ccShiftInfo.room, ccShiftInfo.pair_id, 
            ccShiftInfo.start_day, ccShiftInfo.end_day], function(error, result, fields) {
                conn.query("UPDATE cleaningshifts SET cc_id = ? WHERE room = ? AND day >= ? AND " +
                    "day <= ?", [ccShiftInfo.cc_id, ccShiftInfo.room, ccShiftInfo.start_day, 
                    ccShiftInfo.end_day], function(error, result, fields) {
    
                });
        });
    },
    
    // createUserByEmail: function(conn, email) {
    //     conn.query("INSERT INTO users (email) VALUES (?)", [email], function(error, result, fields) {
    //         console.log(result, fields);
    //         if (error) {
    //             console.error(error);
    //             return {
    //                 status: 500,
    //                 data: {
    //                     message: 'Oops! There was an error.'
    //                 }
    //             }
    //         }
    //         return {
    //             status: 200,
    //             data: {
    //                 message: 'Success.'
    //             }
    //         };
    //     });
    // },
    createPair: async function(db, userIds) {
        try {
            let user_id1, user_id2, user_id3;
            [user_id1, user_id2, user_id3] = userIds;
            await db.query('INSERT INTO pairs (user_id1, user_id2, user_id3) VALUES (?, ?, ?)', [user_id1, user_id2, user_id3]);
            return {
                status: 200,
                data: {
                    message: 'Success.'
                }
            };
        } catch (err) {
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
    },
    updateCleaningShiftStatus: function(conn, status) {}
}

const actions = {
    ...userActions,
    ...groupActions,
    ...otherActions
}

module.exports = {
    Database: Database,
    actions: actions
}