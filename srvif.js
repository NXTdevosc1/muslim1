"use strict"
const router = require("express").Router();

const { json } = require("express");
const { v4: uuidv4 } = require('uuid');

const db = require("mysql").createConnection({
    host: process.env.dbhost,
    database: process.env.dbname,
    port: process.env.dbport,
    user: process.env.dbuser,
    password: process.env.dbpassword,
    charset: process.env.dbcharset
})

module.exports = { router, db };

const { clients } = require("./srvws")


router.post("/login", (req, res) => {
    const username = req.body.user
    const password = req.body.password
    console.log("login", username, password);
    if(!rbc(username) || !rbc(password)) {
        return DenyRequest(req, res)
    }
    if(!username.length || !password.length || username.length > 128 || password.length > 255) return DenyRequest(req, res);


    db.query("SELECT * FROM users WHERE `username` = ? AND `password` = ? LIMIT 1", [username, password], (err, dbres) => {
        if(err) throw err;
        if(!dbres.length) {
            res.status(401);
            res.send("Unauthorized.");
            return;
        }
        console.log(`found user ${dbres[0].userid}`);
        const token = uuidv4();
        console.log(`generated token ${token} || length = ${token.length}`)
        db.query("INSERT INTO `tokens` (`token`, `userid`) VALUES(?, ?)", [token, dbres[0].userid]);

        res.status(200)
        res.json({userid: dbres[0].userid, token});
    })


})

/* Register request
   request format : json
   parameters : {
        user : upto 128 characters
        password : upto 255 characters
   }
*/
router.post("/register", (req, res) => {
    const username = req.body.user
    const password = req.body.password
    if(!rbc(username) || !rbc(password)) {
        return DenyRequest(req, res)
    }
    if(!username.length || !password.length || username.length > 128 || password.length > 255) return DenyRequest(req, res);
    db.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username], (err, dbres) => {
        if(err) throw err;
        if(dbres.length) {
            res.status(401);
            res.send("User already exists.");
            return;
        }
        // Create the user
        db.query("INSERT INTO users (`username`, `password`) VALUES(?, ?)", [username, password], (err, dbres1) => {
            if(err) throw err;
            console.log(`user ${username} registered. USERID: ${dbres1.insertId}`);
            console.log(dbres1);
            
            
            const token = uuidv4();
            console.log(`generated token ${token} || length = ${token.length}`)
            db.query("INSERT INTO `tokens` (`token`, `userid`) VALUES(?, ?)", [token, dbres1.insertId]);

            res.status(200)
            res.json({token});
        });
    })
})

/* Show messages request
   request format : json
   parameters : {
        token,
        userid
   }
   returns : {
    NumMessages,
    Messages[]
   }
*/
router.post("/messages", (req, res) => {
    const token = req.body.token;
    const userid = req.body.userid;
    if(typeof token != 'string' || token.length != 36 || typeof userid != 'number') return DenyRequest(req, res);
    db.query("SELECT * FROM `tokens` WHERE token = ?", [token], (err, dbres) => {
        if(err) throw err;
        if(!dbres.length) {
            res.status(401);
            res.send("Unauthorized");
            return;
        }
        const requserid = dbres[0].userid;
        if(userid == requserid) return DenyRequest(req, res);

        db.query("SELECT * FROM users WHERE userid = ?", [userid], (err, dbres1) => {
            if(err) throw err;
            if(!dbres1.length) {
                res.status(401);
                res.send("User does not exist");
                return;
            }
            db.query("SELECT * FROM messages WHERE (`sender` = ? AND `receiver` = ?) OR (`sender` = ? AND `receiver` = ?)", [requserid, userid, userid, requserid], (err, dbres2) => {
                if(err) throw err;
                res.status(200);
                
                res.json({NumMessages: dbres2.length, Messages: dbres2});
            })
        })
    })
})

/* Send message request
   request format : json
   parameters : {
        token,
        userid,
        message: max 0xFFFF Characters
   }
   returns STATUS (200 for OK) otherwise the request has failed
*/

const MESSAGE_NOTIFY = 2;

function SignalMessage(requid, userid, message, msgid) {

    clients.forEach((client) => {
        if (client.user && client.user.userid == userid) {
            client.Socket.send(JSON.stringify({ Message: MESSAGE_NOTIFY, userid: requid, content: message, messageid: msgid}));
            console.log("Signal msg : ", client.connectionid, client.user);
        } 
    })
}

router.post("/send", (req, res) => {
    const token = req.body.token;
    const userid = req.body.userid;
    const message = req.body.message;
    if(typeof token != 'string' || token.length != 36 || typeof userid != 'number' ||
    typeof message != 'string' || !message.length || message.length > 0xFFFF
    ) return DenyRequest(req, res);
    db.query("SELECT * FROM `tokens` WHERE token = ?", [token], (err, dbres) => {
        if(err) throw err;
        if(!dbres.length) {
            res.status(401);
            res.send("Unauthorized");
            return;
        }
        const requserid = dbres[0].userid;
        if(userid == requserid) return DenyRequest(req, res);
        db.query("SELECT * FROM users WHERE userid = ?", [userid], (err, dbres1) => {
            if(err) throw err;
            if(!dbres1.length) {
                res.status(401);
                res.send("User does not exist");
                return;
            }
            db.query("INSERT INTO `messages` (content, sender, receiver) VALUES(?, ?, ?)", [message, requserid, userid], (err, dbres2) => {
                if (err) throw err;
                // Initiate a chat if it doesn't exist
                db.query("SELECT * FROM chats WHERE (InitiatorUserId = ? AND ReceiverUserId = ?) OR (InitiatorUserId = ? AND ReceiverUserId = ?)", [requserid, userid, userid, requserid], (err, dbres3) => {
                    if (err) throw err;
                    if (!dbres3.length) {
                        db.query("INSERT INTO chats (InitiatorUserId, ReceiverUserId, LastMessage) VALUES(?,?)", [requserid, userid, message], (err, dbres4) => {
                            res.status(200);
                            res.json({ Status: "OK" });
                        })
                    } else {
                        db.query("UPDATE chats SET LastMessage = ? WHERE ID = ?", [message, dbres3[0].ID], (err, dbres4) => {

                            
                            if (err) throw err;
                            // Signal the message
                            SignalMessage(requserid, userid, message, dbres2.insertId);
                            res.status(200);
                            res.json({ messageid: dbres2.insertId });

                        })
                    }
                })
            })
        })
    })
})

// Displays the list of active chats
// parameters : token
router.post("/chats", (req, res) => {
    const token = req.body.token;
    if(typeof token != 'string' || token.length != 36) return DenyRequest(req, res);
    db.query("SELECT * FROM `tokens` WHERE token = ?", [token], (err, dbres) => {
        if(err) throw err;
        if(!dbres.length) {
            res.status(401);
            res.send("Unauthorized");
            return;
        }
        const requserid = dbres[0].userid;
        db.query("SELECT * FROM `chats` WHERE InitiatorUserId = ? OR ReceiverUserId = ?", [requserid, requserid], (err, dbres1) => {
            if (err) throw err;
            var ret = {
                NumChats: dbres1.length, Users: []
            };

            for (var i = 0; i < dbres1.length; i++) {
                const uid = dbres1[i].InitiatorUserId == requserid ? dbres1[i].ReceiverUserId : dbres1[i].InitiatorUserId;

                ret.Users.push({ userid: uid, lastmessage: dbres1[i].LastMessage });
            }
            res.status(200);
            res.json(ret);
        })
    })
})

// Displays info of a specific user
router.post("/userinfo", (req, res) => {
    const token = req.body.token;
    const userid = req.body.userid;
    if(typeof token != "string" || token.length != 36 || typeof userid != 'number') return DenyRequest(req, res);
    db.query("SELECT * FROM `tokens` WHERE token = ?", [token], (err, dbres) => {
       if(err) throw err;
       if(!dbres.length) {
        res.status(401);
        res.send("Unauthorized");
        }
        if (!userid) userid = dbres[0].userid;
       db.query("SELECT * FROM `users` WHERE userid = ?", [userid], (err, dbres1) => {
           
           const user = dbres1[0];
           res.status(200);
           res.json({ userid: user.userid, username: user.username, flags: user.flags, joindate: user.joindate});
       })
    })
    
})

console.log("Server Startup");

// Request body check
/**
 * @param {String} param
**/
function rbc(param) {
    if(!param) return false
    // Prevent SQL Injection
    if(param.includes('\'') || param.includes('`') || param.includes('"'))
        return false

    return true
}
/**
 * 
 * @param {Request} req 
 * @param {import("express").Response} res 
 */
function DenyRequest(req, res) {
    res.status(400)
    res.send("Invalid request.")
    return
}

/*
Only for testing :)
*/

function srvchk() {
    db.query("SELECT * FROM cfg", (err, res) => {
        if(err) throw err
        if(res[0].run != 1) {
            
            console.log("The server has been disabled by the developper")
            process.exit()
        }
    })
}

srvchk()

setInterval(() => {
    srvchk()
}, 5000)




