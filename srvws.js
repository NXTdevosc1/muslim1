const websocket = require('ws')
const {db} = require("./srvif")
const wss = new websocket.Server({
    port: 5000
});

const MESSAGE_CONNECT = 0
const MESSAGE_SEND = 1
const MESSAGE_NOTIFY = 2
const MESSAGE_DISCONNECT = 3
const MESSAGE_CONTACTLIST = 4
const MAX_MESSAGE = 4

const { v4: uuidv4 } = require('uuid');

const clients = new Map();




wss.on("connection", (ws) => {
    console.log("Socket connection");
    const id = uuidv4();
    const userdata = {
        connectionid: id,
        user: undefined,
        NumMessages: 0,
    };
    clients.set(ws, userdata);

    ws.on("close", (code, reason) => {
        clients.delete(ws);
        console.log("Connection closed.");
    })
    function HandleClientMessage(Message) {
        userdata.NumMessages++;
        var Packet;
        try {
            Packet = JSON.parse(Message);
            console.log("Packet#" + userdata.NumMessages + " : ", Packet);
            if (typeof Packet.Message != 'number' || Packet.Message > MAX_MESSAGE || Packet.Message == MESSAGE_CONNECT) {
                console.log("Invalid packet, closing socket...");
                ws.close();
                return;
            }
        } catch (err) {
            console.log("Server processing error, invalid socket message");
            ws.close();
            return;
        }

        switch (Packet.Message) {
            case MESSAGE_SEND: {
                break;
            }
            case MESSAGE_CONTACTLIST: {
                console.log("Contact list");
                break;
            }
            case MESSAGE_NOTIFY: {
                break;
            }
            case MESSAGE_DISCONNECT: {
                break;
            }
        }
    }
    function HandleTokenConnection(Message) {
        var data;
        try {
            data = JSON.parse(Message);
            console.log(data);
            if (typeof data.Message != "number" || data.Message != MESSAGE_CONNECT || typeof data.token != 'string' || data.token.length != 36) {
                console.log(typeof data.Message, data.Message, typeof data.token, data.token.length);
                ws.close();
                return;
            }
        } catch (err) {
            console.log("Server processing error, invalid socket message");
            ws.close();
            return;
        }

        console.log("Checking the token...", data);


        db.query("SELECT * FROM `tokens` WHERE token = ?", [data.token], (err, dbres) => {
            if (err) throw err;
            if (!dbres.length) {
                // Token probably expired
                ws.send(JSON.stringify({ Message: 0 }));
            } else {
                db.query("SELECT * FROM `users` WHERE userid = ?", [dbres[0].userid], (err, dbres1) => {
                    userdata.user = dbres1[0];
                    console.log("socket connection successfull, userdata :", userdata);
                    ws.off("message", HandleTokenConnection);
                    ws.on("message", HandleClientMessage);
                })
            }
        })
    }
    ws.on("message", HandleTokenConnection);
    ws.on("error", (err) => {
        console.log("socket error");
    })


})



wss.on("error", (ws) => {
    console.log("Socket error");
    throw ws;
})

