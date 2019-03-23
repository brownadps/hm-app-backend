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
    createGroup: async function(db, userIds) {
        try {
            let user_id1, user_id2, user_id3;
            [user_id1, user_id2, user_id3] = userIds;
            await db.query('INSERT INTO shiftgroups (user_id1, user_id2, user_id3) VALUES (?, ?, ?)', [user_id1, user_id2, user_id3]);
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
    getGroupIds: async function(db) {
        let results;
        try {
            results = await db.query("SELECT id FROM shiftgroups");
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
            results = await db.query("SELECT id, user_id1, user_id2, user_id3 FROM shiftgroups WHERE id = ?", [groupId]);
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
            results = await db.query("SELECT g.id as group_id, g.user_id1, g.user_id2, g.user_id3 FROM users INNER JOIN shiftgroups AS g ON users.id = g.user_id1 OR users.id = g.user_id2 OR users.id = g.user_id3 WHERE users.id = ?", [userId]);
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
                    message: "User ID not found or is not in a group."
                }
            }));
        }
        return results[0];
    }
}

const shiftActions = {
    getShiftsAfterDate: async function(db, date, groupId) {
        let results;
        try {
            results = await db.query("SELECT room, size, day, " +
                "null as start_day, null as end_day FROM cleaningshifts " +
                "WHERE day >= ? " +
                "UNION SELECT room, null as size, null as day, start_day, end_day " +
                "FROM ccshifts WHERE start_day >= ?", [date, date]);
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
            console.error(`no shifts after this date: ${date}`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "No shifts after this date or date is invalid."
                }
            }));
        }
        return results;
    },
    getShiftsAfterDateByGroup: async function(db, date, groupId) {
        let results;
        try {
            results = await db.query("SELECT id as shift_id, null as cc_shift_id, room, size, " +
                "day, null as start_day, null as end_day, 1 as is_cleaning_shift FROM cleaningshifts " +
                "WHERE group_id = ? AND day >= ? " +
                "UNION SELECT null as shift_id, id as cc_shift_id, room, null as size, null as day, " +
                "start_day, end_day, 0 as is_cleaning_shift " +
                "FROM ccshifts WHERE group_id = ? AND start_day >= ?", [groupId, date, groupId, date]);
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
            console.error(`no shifts after this date: ${date} for this group: ${groupId}`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "No shifts after this date for this group or date is invalid."
                }
            }));
        }
        return results;
    },
    createShift: async function(db, shiftInfo) {
        try {
            const results = await db.query("INSERT INTO cleaningshifts (room, size, points, group_id, day, status) " +
            "VALUES (?, ?, ?, ?, ?, 'ASSIGNED')", [shiftInfo.room, shiftInfo.size, 
            shiftInfo.points, shiftInfo.group_id, shiftInfo.day]);
            const update_results = await db.query("UPDATE cleaningshifts " +
                "RIGHT JOIN ccshifts ON ccshifts.room = cleaningshifts.room AND ccshifts.start_day <= cleaningshifts.day AND ccshifts.end_day >= cleaningshifts.day " +
                "SET cleaningshifts.cc_id = ccshifts.id " +
                "WHERE ccshifts.room = ? AND ccshifts.start_day <= ? AND ccshifts.end_day >= ?",
                [shiftInfo.room, shiftInfo.day, shiftInfo.day]);
            return {
                status: 200,
                data: {
                    message: 'Success.',
                    results_id: results.insertId,
                    update_results_id: update_results.insertId
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
    createCCShift: async function(db, ccShiftInfo) {
        try {
            const results = await db.query("INSERT INTO ccshifts (room, group_id, start_day, end_day, missed, made_up) " +
                "VALUES (?, ?, ?, ?, 0, 0)", [ccShiftInfo.room, ccShiftInfo.group_id, 
                ccShiftInfo.start_day, ccShiftInfo.end_day]);
            const update_results = await db.query("UPDATE cleaningshifts SET cc_id = ? WHERE room = ? AND day >= ? AND " +
                    "day <= ?", [results.id, ccShiftInfo.room, ccShiftInfo.start_day, 
                    ccShiftInfo.end_day]);
            return {
                status: 200,
                data: {
                    message: 'Success.',
                    results_id: results.insertId,
                    update_results_id: update_results.insertId
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
    updateShiftStatus: async function(db, shiftId, status) {
        try {
            const results = await db.query("UPDATE cleaningshifts " +
                "SET status = ? WHERE id = ?", [status, shiftId]);
            return {
                status: 200,
                data: {
                    message: 'Success.',
                    id: results.insertId,
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
    }
}

const emailActions = {
    //this query gets all the info necessary for a reminder email
    //it's a bit complicated...
    getEmailDataByDate: async function(db, date) {
        let results;
        try {
            results = await db.query("SELECT cleaningshifts.room, cleaningshifts.size, " +
                "GROUP_CONCAT(DISTINCT u.email SEPARATOR ', ') as emails, " + 
                "GROUP_CONCAT(DISTINCT u2.first_name SEPARATOR ', ') as cc_names, " +
                "GROUP_CONCAT(DISTINCT u2.email SEPARATOR ', ') as cc_emails " +
                "FROM cleaningshifts " + 
                "INNER JOIN shiftgroups as g on cleaningshifts.group_id = g.id " +
                "RIGHT JOIN users as u ON g.user_id1 = u.id OR g.user_id2 = u.id OR g.user_id3 = u.id " +
                "LEFT JOIN ccshifts AS cc ON ISNULL(cc.id) OR cleaningshifts.cc_id = cc.id " +
                "LEFT JOIN shiftgroups AS g2 on cc.id IS NOT NULL AND cc.group_id = g2.id " +
                "LEFT JOIN users as u2 ON cc.id IS NOT NULL AND (g2.user_id1 = u2.id OR g2.user_id2 = u2.id OR g2.user_id3 = u2.id) " +
                "WHERE day = ? GROUP BY cleaningshifts.id, cc.id, g.id, g2.id", [date]);
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
            console.error(`no shifts on this date: ${date}`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "No shifts on this date or date is invalid."
                }
            }));
        }
        return results;
    },
    getCCEmailDataByRoom: async function(db, room, startDay) {
        let email_results;
        try {
            const id_results = await db.query("SELECT ccshifts.id FROM ccshifts " +
                "WHERE room = ? AND start_day = ?",
                [room, startDay]);

            if (!id_results || id_results.length < 1) {
                console.error(`no id for this cc shift: ${room} ${startDay}`);
                throw new Error(JSON.stringify({
                    status: 404,
                    data: {
                        message: "No id for cleaning coordinators for this room or start day."
                    }
                }));
            }

            email_results = await db.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.day, " +
                "GROUP_CONCAT(DISTINCT u.first_name SEPARATOR ', ') as group_names, " +
                "GROUP_CONCAT(DISTINCT u2.email SEPARATOR ', ') as cc_emails " +
                "FROM cleaningshifts " + 
                "INNER JOIN shiftgroups as g on cleaningshifts.group_id = g.id " +
                "RIGHT JOIN users as u ON g.user_id1 = u.id OR g.user_id2 = u.id OR g.user_id3 = u.id " +
                "LEFT JOIN ccshifts AS cc ON cleaningshifts.cc_id = cc.id " +
                "LEFT JOIN shiftgroups AS g2 on cc.group_id = g2.id " +
                "LEFT JOIN users as u2 ON cc.id IS NOT NULL AND (g2.user_id1 = u2.id OR g2.user_id2 = u2.id OR g2.user_id3 = u2.id) " +
                "WHERE cc_id = ? GROUP BY cleaningshifts.id, cc.id, g.id, g2.id", [id_results[0].id]);
        } catch (err) {
            console.log("hi");
            console.error(err);
            throw new Error(JSON.stringify({
                status: 500,
                data: {
                    message: 'Oops! There was an error.'
                }
            }));
        }
        if (!email_results || email_results.length < 1) {
            console.error(`no info for this cc shift: ${room} ${startDay}`);
            throw new Error(JSON.stringify({
                status: 404,
                data: {
                    message: "No info for cleaning coordinators for this room or start day."
                }
            }));
        }
        return email_results;
    }
}

const otherActions = {
    getGroupMembers: function(conn, groupId) {
        conn.query("SELECT shiftgroups.id, shiftgroups.user_id1, shiftgroups.user_id2, shiftgroups.user_id3, users.first_name, users.last_name FROM shiftgroups, users WHERE shiftgroups.id = ? AND (users.id = shiftgroups.user_id1 OR users.id = shiftgroups.user_id2 OR users.id = shiftgroups.user_id3)", [groupId], 
            function(error, result, fields) {
                console.log(result);
        });
    },
    getCCShifts: function(conn, ccId) {
        conn.query("SELECT cleaningshifts.room, cleaningshifts.size, cleaningshifts.day, " + 
            "cleaningshifts.group_id, g.user_id1, g.user_id2, g.user_id3 FROM cleaningshifts " + 
            "INNER JOIN shiftgroups AS g ON cleaningshifts.group_id = g.id WHERE cleaningshifts.cc_id = ?", 
            [ccId], function(error, result, fields) {
                console.log(result);
                //console.error(error);
        });
    },

    addCCShift: function(conn, ccShiftInfo) {
        conn.query("INSERT INTO ccshifts (room, group_id, start_day, end_day, missed, made_up) " +
            "VALUES (?, ?, ?, ?, 0, 0)", [ccShiftInfo.room, ccShiftInfo.group_id, 
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
    updateCleaningShiftStatus: function(conn, status) {}
}

const actions = {
    ...userActions,
    ...groupActions,
    ...shiftActions,
    ...emailActions,
    ...otherActions
}

module.exports = {
    Database: Database,
    actions: actions
}