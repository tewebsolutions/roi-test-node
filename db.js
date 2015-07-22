/**
 * DB module.
 * 
 * SQLite DB Driver for Data Operations, uses local file ./private/db.db
 * API can be substituted with MongoDB or other DBMS
 * 
 * @module db
 * 
 */
 
module.exports = function(app) {
    
    var sqlite3 = require("sqlite3"),
        fs = require("fs"),
        path = require("path");
    

    
    var file = path.resolve("private/db.db");
    
    console.log("DB", "Initializing SQLite DB", file);
    
    
    if (!fs.existsSync(file)) {
        console.log("DB", "New DB, SQLite DB file");
        fs.openSync(file, 'w');
    } else {
        console.log("DB", "SQLite file found");
    }
    
    var db = new sqlite3.Database(file);
    
    //SQL Statements
    
    var sqlCreateTableUser = 'CREATE TABLE IF NOT EXISTS user (\
                                        uid INTEGER PRIMARY KEY AUTOINCREMENT , \
                                        email TEXT, \
                                        fullname TEXT, \
                                        password TEXT, \
                                        fb_id TEXT, \
                                        github_id TEXT, \
                                        active INTEGER);\
                                ',
        sqlCreateIndexEmail = 'CREATE UNIQUE INDEX IF NOT EXISTS idx_email ON user (email);',
    
        sqlCreateTableToken = 'CREATE TABLE IF NOT EXISTS user_token (\
                                        tokid INTEGER PRIMARY KEY ASC, \
                                        email TEXT, \
                                        datetime DATETIME, \
                                        token TEXT, \
                                        type TEXT);',
    
        sqlCreateIndexToken = 'CREATE UNIQUE INDEX IF NOT EXISTS idx_token ON user_token (token);',
    
    
        sqlCheckUserPass = 'SELECT uid, email, fullname, fb_id, github_id, active FROM user WHERE email=? AND password=?',
        sqlCheckEmail = 'SELECT uid, email, fullname, fb_id, github_id, active FROM user WHERE email=?',
        sqlNewUser = 'INSERT INTO user (email, fullname, password, fb_id, github_id, active) VALUES (?, ?, ?, ?, ?, ?)',
        sqlNewToken = 'INSERT INTO user_token (email, datetime, token, type) VALUES (?, ?, ?, ?)',
        sqlUpdateUser = 'UPDATE user SET fullname=?, fb_id=?, github_id=? WHERE email=?',
        sqlUpdatePassword = 'UPDATE user SET password=? WHERE email = ?',
        sqlActivateUser = 'UPDATE user SET active=1 WHERE email = ?',
        sqlCheckToken = 'SELECT email, datetime, token, type FROM user_token WHERE email=? AND token=? AND type=?',
        sqlDeleteTokenByEmail = 'DELETE FROM user_token WHERE email=?';
    
    
    //Create tables    
    db.serialize(function() {
        var errB = false;
    
        db.run(sqlCreateTableUser, function(err, data) {
            errB |= err;
        });
        db.run(sqlCreateTableToken, function(err, data) {
            errB |= err;
        });
        db.run(sqlCreateIndexEmail, function(err, data) {
            errB |= err;
        });
        db.run(sqlCreateIndexToken, function(err, data) {
            errB |= err;
            if (!errB) {
                console.log("DB", "Created tables.");
            } else {
                console.error("DB", "Error creating tables.");
            }
    
        });
    });
    
    //Get user by email
    var checkEmailExists = function(email, cb) {
    
        db.get(sqlCheckEmail, [email], function(err, row) {
            if (!err && row) {
                cb(null, {
                    emailExists: true,
                    user: row
                });
            } else {
                cb(null, {
                    emailExists: false
                });
            }
        });
    
    };
    
    
    var createUser = function(email, fullname, password, fb_id, github_id, active, cb) {
        //Set defaults for optional args
        password = password ? app.utils.md5(password) : "";
        fb_id = fb_id ? fb_id : "";
        github_id = github_id ? github_id : "";
        active = active ? 1 : 0;
    
        checkEmailExists(email, function(err, data) {
            if (!err) {
                if (data.emailExists) {
                    cb(null, {
                        success: false,
                        emailExists: true,
                        error: "Email already exists",
                        user: data.user
                    });
                } else {
                    db.run(sqlNewUser, [email, fullname, password, fb_id, github_id, active], function(err, data) {
                        if (!err)
                        {
                            db.get(sqlCheckEmail, [email], function(err, row) {
                                console.error(err, row);
                                if (!err) {
                                    console.log("DB", "Create User", "Verifying", email);
                                    checkEmailExists(email, function(err, newUser) {
                                        if (!err && newUser.user) {
                                            console.log("DB", "Create User", "Verified", email);
                                            cb(null, {
                                                success: true,
                                                user: newUser.user
                                            });
                                        } else {
                                            cb(err);
                                        }
                                    });
                                } else {
                                    cb(true, {
                                        success: false,
                                        error: "Internal error -> Unable to get user"
                                    });
                                }
                            });
                        }
                        else
                        {
                            cb(true, {
                                        success: false,
                                        error: "Internal error -> Unable to insert user"
                                    });
                        }
                    });
                }
    
            } else {
                cb(null, {
                    success: false,
                    error: "Internal error -> Unable to get user"
                });
            }
    
        });
    };
    
    var authenticate = function(email, password, cb) {
        var passwordHash = app.utils.md5(password);
        db.get(sqlCheckUserPass, [email, passwordHash], function(err, row) {
            if (!err && row) {
                if (row.active == 1) {
                    console.log("DB", "Found user ", row.email);
                    cb(null, {
                        success: true,
                        user: row
                    });
                } else {
                    console.log("DB", "Found inactive user ", row.email);
                    cb(null, {
                        success: false,
                        user: row,
                        error: "Account is not activated. Please check your email for activation link"
                    });
                }
            } else {
                cb(null, {
                    success: false,
                    error: "Invalid email/password combination"
                });
            }
        });
    
    };
    
    var updatePassword = function(email, password, cb) {
        console.log("DB", "Update password ", email);
        password = password ? app.utils.md5(password) : "";
    
    
        checkEmailExists(email, function(err, data) {
            if (!err) {
                if (data.emailExists) {
                    if (!data.user.active) {
                        cb(false, {
                            success: false,
                            error: "Email is registered but not activated. Check your email for activation instructions"
                        });
                    } else {
                        db.run(sqlUpdatePassword, [password, email], function(resp) {
                            console.log("DB", "Updated password ", email);
                            cb(null, {
                                success: true,
                                user: data.user
                            });
                        });
                    }
    
                } else {
                    cb(false, {
                        success: false,
                        error: "Cannot find email in the system"
                    });
                }
    
            } else {
                cb(false, {
                    success: false,
                    error: "Internal error"
                });
            }
    
        });
    };
    var updateUser = function(email, newUser, cb) {
        checkEmailExists(email, function(err, data) {
            if (!err) {
                if (data.emailExists) {
                    db.run(sqlUpdateUser, [newUser.fullname, newUser.fb_id, newUser.github_id, email], function(resp) {
                        console.log("DB", "Updated user ");
                        checkEmailExists(email, cb);
                    });
                } else {
                    cb(false, {
                        success: false,
                        error: "Cannot find email in the system"
                    });
                }
    
            } else {
                cb(false, {
                    success: false,
                    error: "Internal error"
                });
            }
    
        });
    };
    
    var createToken = function(email, type, cb) {
        var token = app.utils.tokenFn(),
            date = Date.now();
        db.run(sqlNewToken, [email, date, token, type], function(err, resp) {
            console.log("DB", "Generated new token ", email);
            if (!err) {
                cb(null, {
                    success: true,
                    email: email,
                    token: token
                });
            } else {
                cb(true, {
                    success: false,
                    error: "Unable to generate token"
                });
                console.error("DB", "Key conflict error", err);
            }
        });
    };
    
    var forgotPassword = function(email, cb) {
        checkEmailExists(email, function(err, data) {
            if (!err) {
                if (data.emailExists) {
                    if (data.user.active)
                    {
                        createToken(email, "reset", function(err, resp) {
                            cb(err, {
                                success: true,
                                user: data.user,
                                token: resp.token
                            });
                        });
                    }
                    cb(null, {
                        success: false,
                        error: "Account is not activated"
                    });
    
                } else {
                    cb(null, {
                        success: false,
                        error: "Cannot find email in the system"
                    });
                }
    
            } else {
                cb(null, {
                    success: false,
                    error: "Internal error"
                });
            }
    
        });
    };
    
    var checkForgotToken = function(email, token, cb) {
    
        getToken(email, token, "reset", function(err, data) {
    
            if (!err && data.success) {
                var tokenObj = data.tokenObj;
                if (app.utils.isTokenExpired(tokenObj.datetime)) {
                    cb(null, {
                        success: false,
                        error: "Password reset token has expired",
                        route: "forgot"
                    });
                } else {
                    cb(null, {
                        success: true,
                        token: tokenObj,
                        route: "setpassword"
                    });
                }
    
            } else {
                cb(null, {
                    success: false,
                    error: "Password reset token not found"
                });
            }
    
        });
    };
    
    var getToken = function(email, token, type, cb) {
        db.get(sqlCheckToken, email, token, type, function(err, row) {
            console.log("DB", "Get token", email);
            if (!err && row) {
                cb(null, {
                    success: true,
                    tokenObj: row
                });
            } else {
                cb(null, {
                    success: false,
                    error: "Invalid token"
                });
            }
        });
    };
    
    
    
    var activate = function(email, token, cb) {
        db.run(sqlActivateUser, email, function(err, result) {
            console.log("DB", "Activate user");
            deleteUserToken(email, function() {
                cb({
                    route: "account",
                    token: token,
                    err: err
                });
            });
        });
    };
    
    //This also cleans activation tokens as an intended side effect
    var deleteUserToken = function(email, cb) {
        db.run(sqlDeleteTokenByEmail, email, function(err, result) {
            if (!err) {
                console.log("DB", "Delete tokens by email", email);
                cb(null, {
                    success: true
                });
            } else {
                cb(null, {
                    success: false,
                    error: "Unable to delete tokens by email"
                });
            }
        });
    };
    
    
    
    
    return {
        activate: activate,
        createUser: createUser,
        createToken: createToken,
        getToken: getToken,
        checkEmailExists: checkEmailExists,
        authenticate: authenticate,
        forgotPassword: forgotPassword,
        checkForgotToken: checkForgotToken,
        deleteUserToken: deleteUserToken,
        updateUser: updateUser,
        updatePassword: updatePassword
    };

};