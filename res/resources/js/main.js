/*
 Javascript check file
*/
const MESSAGE_CONNECT = 0
const MESSAGE_SEND = 1
const MESSAGE_NOTIFY = 2
const MESSAGE_DISCONNECT = 3

const parseCookie = str =>
  str
  .split(';')
  .map(v => v.split('='))
  .reduce((acc, v) => {
    acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
    return acc;
  }, {});


var cookies = {};

try {
    if(document.cookie.length) cookies = parseCookie(document.cookie);
} catch(err) {
    alert("Invalid cookies, please delete them");
}

console.log("cookies:", cookies, "token", cookies.token);


var Socket = null;

MessageWait = false;

if(cookies.token) {
    
    Socket = new WebSocket("ws://localhost:5000");
    
    Socket.onopen = ((ev) => {
        console.log("OPEN", (ev));
        Socket.send((JSON.stringify({Message: MESSAGE_CONNECT, token: cookies.token})));
    })
    
    Socket.onmessage = ((ev) => {
        const data = JSON.parse(ev);
        switch(data.Message) {
            case MESSAGE_NOTIFY:
                {
                    console.log("Notify:", data);
                    break;
                }
            case MESSAGE_DISCONNECT:
                {
                    alert("Server wants to disconnect the client.");
                    document.cookie = '';
                    document.location.reload();
                    break;
                }
        }
        if(data.Message == MESSAGE_DISCONNECT) {

        }
        console.log("MESSAGE", data);
    })
    
    Socket.onclose = ((ev) => {
        alert("Server connection died.");
        document.location.reload();
    })
    
    
    Socket.onerror = ((ev) => {
        alert("Server connection error.");
        document.location.reload();
    })



}

function __Request(Request, Body, Callback) {
    fetch(`/if/${Request}`, { method: "POST", headers: { accept: "application/json", "content-type":"application/json" }, body: JSON.stringify(Body) }).then((res) => {
        if (res.status != 200) throw `[${Request}] Request failed.`;

        return res.json();
    })
        .then((res) => {
            Callback(res);
        }).catch((err) => {
            throw err;
        })

}


/*
 * THIS IS THE EXAMPLE OF READING THE CHAT LIST
 * */
__Request("chats", { token: cookies.token }, (res) => {
    console.log("Number of open chats:", res.NumChats);
    for (let i = 0; i < res.NumChats; i++) {
        __Request("userinfo", { token: cookies.token, userid: res.Users[i] }, (res) => {
            console.log(res);
        })
    }
})