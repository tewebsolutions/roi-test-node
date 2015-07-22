/**
 * Mail module.
 * 
 * Integration with Mandrill API
 * 
 * @module auth
 * 
 */
 
module.exports = function(app) {
    var mandrill = require('node-mandrill')(app.globals.API_NODE_MANDRILL),
        mc = require("microtemplates"),
        from_email = "no-reply@" + app.globals.APP_HOST + ".com",
        from_name = app.globals.APP_NAME;

    var TMPL_WELCOME = "Hi <%= fullname %>, welcome to <%= appname %>.\n Your account is now activated.",
        TMPL_FORGOT = "Hi <%= fullname %>, \nPlease reset your password by clicking this link: \n<%= link %>\nThis link will expire in 24 Hours.",
        TMPL_ACTIVATE = "Hi <%= fullname %>, \nPlease activate you account by clicking this link: \n<%= link %>\n";

    var welcomeEmail = function(email, fullname, done) {

        mandrill('/messages/send', {
            message: {
                to: [{
                    email: email,
                    name: fullname
                }],
                from_email: from_email,
                from_name: from_name,
                subject: "Welcome to " + app.globals.APP_NAME,
                text: "Hi " + fullname + ", welcome to " + app.globals.APP_NAME
            }
        }, done);
    };



    var activateEmail = function(email, fullname, token, done) {
        var link = app.globals.APP_URL + '/token/activate/' + token + '/' + email,
            text = mc(TMPL_ACTIVATE, {
                "fullname": fullname,
                "link": link
            });

        mandrill('/messages/send', {
            message: {
                to: [{
                    email: email,
                    name: fullname
                }],
                from_email: from_email,
                from_name: from_name,
                subject: "Activate your account",
                text: text
            }
        }, done);
    };

    var forgotEmail = function(email, fullname, token, done) {
        var link = app.globals.APP_URL + '/token/reset/' + token + '/' + email,
            text = mc(TMPL_FORGOT, {
                "fullname": fullname,
                "link": link
            });

        mandrill('/messages/send', {
            message: {
                to: [{
                    email: email,
                    name: fullname
                }],
                from_email: from_email,
                from_name: from_name,
                subject: "Reset your password",
                text: text
            }
        }, done);
    };

    return {
        welcome: welcomeEmail,
        forgot: forgotEmail,
        activate: activateEmail
    };

};