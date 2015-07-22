
var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    session = require('express-session');

app.globals = require('./globals');

//Configure Express
app.use(express.static('client'));
app.use(cookieParser());
//To parse POST requests
app.use(bodyParser.urlencoded());
app.use(session({ secret: app.globals.SESSION_HASH }));

app.utils = require("./utils")(app);
app.db = require('./db')(app);
app.common = require("./common")(app);
app.auth = require('./auth')(app);
app.mail = require('./mail')(app);


app.post('/api/login', function(req, res, next) {
    app.passport.authenticate('local', function(err, user, info) {
        if (user) {
            req.logIn(user, function(){
                res.send({
                    success: true,
                    user: user
                });
            });
        } else {
            res.send({
                success: false,
                error: err
            });
        }
    })(req, res, next);
});

app.post('/api/register', function(req, res) {
    var email = req.body.email,
        fullname = req.body.fullname,
        password = req.body.password;
        
    app.db.createUser(email, fullname, password, "", "", 0, function(err, data){
       
        //If user is created or if user already exists but has not been activated, send activation email
        if (!err && (data.success || (!data.success && data.user && data.user.active === 0)))
        {
            app.common.sendActivation(data.user, function (err){
                if (!err) {
                    
                    return res.send(data);
                }
            });
        }
        else
        {
            res.send(data);
        }
    });

});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect("/#login");
});


app.get('/token/:type/:token/:email', function(req, res) {
    var token = req.params.token,
        email = req.params.email,
        type = req.params.type,
        message, route, url;
    
    console.log("Token", email, type, token);
    if (type === "reset")
    {
        app.db.checkForgotToken(email, token, function(err, resp) {
            console.log("Reset token");
            if (!err && resp.success)
            {
                req.login({email: resp.token.email}, function(err) {
                    if (!err)
                    {
                        route = resp.route;
                        message = {type: "info", msg: "Please set your new password before proceeding."};
                        url = '/?msg='+app.utils.qs.stringify(message)+'#'+route;
                        res.redirect(url);
                    }
                });
            }
            else
            {
                message = {type: "error", msg: resp.error};
                route = resp.route ? resp.route : "login";
                url = '/?msg='+app.utils.qs.stringify(message)+'#'+route;
                res.redirect(url);
            }
            console.log("Redirecting to ", url);
        });
    }
    else if (type == "activate")
    {
        console.log("Activation token");
        app.db.getToken(email, token, "activate", function(err, data){
            if (!err && data.tokenObj)
            {
                 app.db.activate(email, token, function(err) {
                    if (!err)
                    {
                        console.log("Logging in");
                        req.login({email: email}, function(err) {
                            if (!err)
                            {
                                route = "account";
                                message = {type: "info", msg: "Welcome to "+app.globals.appName};
                                url = '/?msg='+app.utils.qs.stringify(message)+'#'+route;
                                console.log("Acitvated ", req.user);
                                res.redirect(url);
                            }
                        });
                    }
                    else
                    {
                        res.redirect('/');
                    }
                });
            }
            else
            {
                message = {type: "error", msg: data.error};
                route = "login";
                url = '/?msg='+app.utils.qs.stringify(message)+'#'+route;
                res.redirect(url);
            }
        });
       
    }
});


app.post('/api/setpassword',  app.auth.authorize, function(req, res) {
    var email = req.body.email,
        password = req.body.password;
        
    app.db.updatePassword(email, password, function(err, data) {
        
        if (!err && data.success)
        {
            //Clear all email tokens when password changes
            app.db.deleteUserToken(email, function(){
                res.send(data);  
            });
        }
        
    });
});

app.get('/api/auth', function(req, res) {
    if (req.user)
    {
        res.send({
            success: true,
            user: req.user
        });
    }
    else
    {
        res.send({
            success: false
        });
    }
});


app.post('/api/forgot', function(req, res) {
    var email = req.body.email;
        
    app.db.forgotPassword(email, function(err, data) {
        if (!err && data.success) {
            app.mail.forgot(data.user.email, data.user.fullname, data.token, function() {
                res.send(data);
            });
        } else {
            res.send(data);
        }
    });
});


var port = process.env.PORT || 80;
var server = app.listen(port, function() {
    console.log('%s listening at %s port %s', app.globals.APP_NAME, app.globals.APP_URL, port);
});