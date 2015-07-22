/**
 * Auth module.
 * 
 * Handles PassportJS Strategies
 * 
 * @module auth
 * 
 */

module.exports = function(app) {
    var passport = require("passport"),
        passportLocal = require("passport-local").Strategy,
        passportFacebook = require("passport-facebook").Strategy,
        passportGithub = require("passport-github2").Strategy;

    app.use(passport.initialize());
    app.use(passport.session());


    passport.serializeUser(function(user, done) {
        // console.log("Auth", "Serialize", user);
        if (user && user.email) {
            done(null, user.email);
        } else {
            done(null, {});
        }

    });

    passport.deserializeUser(function(email, done) {
        email = email; //FB profile uses email.value

        app.db.checkEmailExists(email, function(err, resp) {
            console.log(email, resp);
            if (resp.emailExists) {
                done(null, resp.user);
            } else {
                done(null, {});
            }

        });
    });


    /*
     * Local Sign Up
     */
    passport.use(new passportLocal({
        usernameField: "email",
        passwordField: "password",
        passReqToCallback: true,
        session: true

    }, function(req, email, password, done) {
        return app.db.authenticate(email, password, function(err, data) {

            if (!err && data.success) {
                 console.log("Auth", "Login success", email);
                done(null, data.user);
            } else {
                console.log("Auth", "Login error", email);
                // If inactive account trying to sign in, resend activation email
                if (data.user && data.user.active === 0) {
                    app.common.sendActivation(data.user, function(err, data) {
                        if (err) {
                            console.error("Auth", "Error sending activation mail to ", data.user.email);
                        }
                    });
                }
                done(data.error, false);
            }
        });
    }));

    //Integrate Facebook/Github Profile with Local DB
    var socialLogin = function(user, done) {

        //Social accounts with no email are incompatible with DB
        //TODO: Prompt email if not supplied by OAuth
        if (!user.email) {
            done("This account does not have an email associated with it. Please go back and try a different account");

        } else {
            console.log("Social Login ", user);

            //Social login accounts are pre-activated, no need for email confirmation

            app.db.createUser(user.email, user.fullname, user.password, user.fb_id, user.github_id, 1, function(err, data) {
                console.log("Auth", user.email, data);
                //If this is a newly registered user, send welcome email
                if (data.success) {
                    console.log("Auth", "New Social Login User");
                    app.mail.welcome(user.email, user.fullname, function() {
                        console.log("Auth", "Done sending email");
                        done(err, data.user);
                    });
                }
                //If email exists and user has linked FB account, proceed to login
                else if (data.emailExists && data.user) {

                    console.log("Full name ", data.user.fullname, user.fullname);

                    if (!data.user.fullname && user.fullname) {
                        data.user.fullname = user.fullname;
                    }

                    if (user.fb_id && data.user.fb_id !== user.fb_id) {
                        console.log("Auth", "Existing Account, New FB User");
                        data.user.fb_id = user.fb_id;
                    } else if (user.github_id && data.user.github_id !== user.github_id) {
                        console.log("Auth", "Existing Account, New Github User");
                        data.user.github_id = user.github_id;
                    }
                    //More providers...
                    else {
                        console.log("Auth", "Existing Account, Existing Social Login");
                    }
                    //Update local DB with social profile
                    app.db.updateUser(user.email, data.user, function(err, resp) {
                        done(err, resp.user);
                    });

                } else {
                    console.error("Auth", "Unexpected condition", err);
                }
            });
        }

    };
    /*
     * Github 
     */
    passport.use(new passportGithub({
            clientID: app.globals.API_GITHUB_CLIENT_ID,
            clientSecret: app.globals.API_GITHUB_SECRET,
            callbackURL: app.globals.APP_URL + "/api/login/github/callback"
        },
        function(token, tokenSecret, profile, done) {
            var err = false,
                user = {
                    fullname: null, //GitHub does not provide fullname, only screenname
                    email: profile.emails[0].value,
                    password: "",
                    github_id: profile.id
                };

            process.nextTick(function() {
                socialLogin(user, done);
            });
        }
    ));

    app.get('/api/login/github',
        passport.authenticate('github', {
            scope: ['user', 'user:email']
        }));

    app.get('/api/login/github/callback',
        passport.authenticate('github', {
            successRedirect: '/#account',
            failureRedirect: '/#login'
        }));


    /*
     * Facebook 
     */
    passport.use(new passportFacebook({
            clientID: app.globals.API_FACEBOOK_APP_ID,
            clientSecret: app.globals.API_FACEBOOK_SECRET,
            callbackURL: app.globals.APP_URL + "/api/login/facebook/callback"
        },
        function(accessToken, refreshToken, profile, done) {
            var err = false,
                user = {
                    fullname: profile.displayName,
                    email: profile.emails[0].value,
                    password: "",
                    fb_id: profile.id
                };

            process.nextTick(function() {
                socialLogin(user, done);
            });



        }
    ));




    app.get('/api/login/facebook',
        passport.authenticate('facebook', {
            scope: ['email']
        }));

    app.get('/api/login/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect: '/#account',
            failureRedirect: '/#login'
        }));

    app.passport = passport;

    return {
        authorize: function(req, res, next) {
            if (req.user && req.body && (req.user.email == req.body.email)) {
                return next(null, req, res);
            } else {
                res.status(401);
                return res.send({
                    success: false,
                    error: "Unauthorized"
                });
            }
        }
    };
};