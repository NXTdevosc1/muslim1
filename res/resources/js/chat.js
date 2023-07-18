var currentuser = null;
var __oc = false;
    const ctlist = document.getElementById("ctlist");
const chatwnd = document.getElementById("chatwnd");
function onConnect() {
    if (__oc) return;
    __oc = true;


__Request("chats", { token: cookies.token }, (res) => {
    console.log("Number of open chats:", res.NumChats);
    for (let i = 0; i < res.NumChats; i++) {
        __Request("userinfo", { token: cookies.token, userid: res.Users[i].userid }, (userdata) => {
            console.log(res);
            ctlist.innerHTML += `
                  <li class="contact-item active" data-conversation="${i}" onclick='RenderChat(${JSON.stringify(userdata)})'>
                    <img src="${(userdata.flags & 1) ? `/resources/pfps/${userdata.userid}.png` : `/resources/T islam logo.png`}" alt="${userdata.username}" class="contact-image">
                    <div class="contact-details">
                    <h5 class="contact-name">${userdata.username} </h5>
                     <p class="contact-id">ID: ${userdata.userid}</p>
                    <p class="message-content">${res.Users[i].lastmessage}</p>
                    </div>
                    </li>
                    `;
            if (i == 0) RenderChat(userdata);
        })
    }
})





}

function send() {
    const messageinput = document.getElementById("messageinput");
    const text = messageinput.value;
    if (!text.length) return;
    messageinput.value = '';
    messageinput.focus();
    console.log("Sending", text, "to user id", currentuser.userid);
    const mid = generateRandomId();
    PushMessage(currentuser.userid, text, mid);
    __Request("send", { token: cookies.token, userid: currentuser.userid, message: text }, (res) => {
        const m = document.getElementById(`msg${mid}`);
        m.id = `msg${res.messageid}`;
        m.classList.remove("awaiting");
        console.log("response", res);
    })
}


function RenderChat(user) {
    Inchat = true;
    msginc = 0;
    if (!currentuser || currentuser.userid != user.userid) {
        currentuser = user;
    } else return; // no need to render for the same user
    console.log("Rendering chat for : ", user);

    chatwnd.innerHTML = `
    <img src="${(user.flags & 1) ? `/resources/pfps/${user.userid}.png` : `/resources/T islam logo.png`}" alt="${user.username}" class="chat-image">
    <div class="chat-header-details">
        <h4 class="chat-name">${user.username}</h4>
        <p class="chat-id">ID: ${user.userid}</p>
    </div>
    <div class="chat-messages" id="chatmsgs">
    </div>
    <div class="chat-input">
        <input type="text" autofocus class="message-input" id="messageinput" placeholder="Type your message...">
        <button class="send-button" onclick="send()"><i class="fas fa-paper-plane"></i></button>
    </div>
`


    Socket.send(JSON.stringify({ Message: MESSAGE_MESSAGELIST, userid: user.userid }));
}

document.addEventListener('keydown', (ev) => {
    if (ev.keyCode == 13) {
        send();
    }
})