/**
 * Utils module.
 * 
 * Integration with Mandrill API
 * 
 * @module auth
 * 
 */
 
module.exports = function (app) 
{
    var crypto = require("crypto"),
        querystring = require("querystring");
        
    //TODO: Add salt
    var md5 = function (text) {     
        return crypto.createHash('md5').update(text).digest('hex');
    };
    
    //32 Bit Token
    var tokenFn = function(text) {
        return crypto.randomBytes(32).toString('hex');
    };
    
    var isTokenExpired = function (date, limit) {
        var created = new Date(date),
            now = new Date(); 
            limit = limit || 24*3600*1000; //Default to 24 Hours
        return (now-created) > limit;
    };      
    
    return {
        qs: querystring,
        md5: md5,
        tokenFn: tokenFn,
        isTokenExpired: isTokenExpired
    };
};