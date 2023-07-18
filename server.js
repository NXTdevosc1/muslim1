"use strict"
require("dotenv").config()

const express = require("express")
const cookies = require("cookies")
const bodyParser = require("body-parser")
const app = express()
const Port = 80

const srvif = require("./srvif")
const srvws = require("./srvws");


app.use(express.static((__dirname+'\\res')))
app.set('views', __dirname+'\\views')
app.set('view engine','ejs')
app.engine('ejs', require('ejs').__express)
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())

app.use(cookies.express("a","b","c"))


app.use("/if", srvif.router);

const fs = require("fs");

const Navbar = fs.readFileSync("views/navbar.ejs", "utf-8");

app.use((req, res, next) => {
    if(req.method == 'GET')  {
        const token = req.cookies.get('token');
        res.locals.Navbar = Navbar;
        if(typeof token != 'string' || token.length != 36) {
            res.locals.user = null;
            req.cookies.set('token', null);
            next();
        } else {
            console.log(`GET Token : ${token}`);
            srvif.db.query("SELECT * FROM `tokens` WHERE `token` = ? LIMIT 1", [token], async (err, [result]) => {
                
                if(!result) {
                    res.locals.user = null;
                    req.cookies.set('token', null);
                    next();
                } else {
                    console.log("userid", result.userid);
                    srvif.db.query("SELECT * FROM `users` WHERE `userid` = ? LIMIT 1", [result.userid], (err, [user]) => {
                        res.locals.user = user;
                        res.locals.tokenid = result.ID;
                        next();
                    })
                }
            })
        }
    } else next();
})

app.get("/", (req, res) => {
    console.log(`user :`, res.locals.user);
    if(!res.locals.user) res.redirect('/login');
    else res.render("home", {user:res.locals.user});
})

// Only for testing...
app.get("/home", (req, res) => {
    res.render("home")
})

app.get('/logout', async (req, res) => {
    if(res.locals.user) {
        const tokenid = res.locals.tokenid;
        console.log("deleting token id", tokenid);
        srvif.db.query("DELETE FROM `tokens` WHERE ID = ? LIMIT 1", [tokenid], (err, result) => {
            if(err) throw err;
            req.cookies.set('token', null);
            res.redirect('/login');
        })
    } else res.redirect('/login');
})

app.get("/login", (req, res) => {
    if(res.locals.user) res.redirect('/');
    else {

        res.render("login")
    }
})

app.get("/register", (req, res) => {
    if(res.locals.user) res.redirect('.');
    else res.render("register")
})

app.get("/help", (req, res) => {
    res.render("help")
})

app.get("/inmeeting", (req, res) => {
    res.render("inmeeting")
})

app.get("/support", (req, res) => {
    res.render("support")
})

app.get("/moreinfo", (req, res) => {
    res.render("More_info")
})

app.get("/settings", (req, res) => {
    res.render("settings")
})

app.get("/contact", (req, res) => {
    res.render("contact")
})

app.get("*", (req, res) => {
    res.status(404)
    res.render("notfound")
})


app.listen(Port, () => {
    console.log('Server listening on port ' + Port)
})