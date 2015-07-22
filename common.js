/**
 * Common module.
 * 
 * Shared methods
 * 
 * @module auth
 * 
 */
module.exports = function(app) {
    return {
        sendActivation: function(user, cb) {
            if (user && user.email && !user.active) {
                console.log("Common","sendActivation", user);
                app.db.createToken(user.email, 'activate', function(err, data) {
                    if (!err) {
                        var token = data.token;
                        app.mail.activate(user.email, user.fullname, data.token, cb);
                    } else {
                        return cb(err, data);
                    }
                });
            } else {
                return false;
            }
        }
    };
};