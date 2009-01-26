/**
 * A collection of general server and proxy related functions
 * @author Chad Auld
 */

/**
 * Used to strip html tags from a given string
 * Note: This method is taken from http://www.prototypejs.org
 * Prototype is freely distributable under the terms of an MIT-style license.
 * 
 * @param {Object} str
 */
function strip_tags(str){
	return str.replace(/<\/?[^>]+>/gi, '');
}

strip_tags.runat = "both";

/**
 * Returns Jaxer build number
 */
function getJaxerBuild(){
    return Jaxer.buildNumber;
}

getJaxerBuild.proxy = true;

/**
 * Turn a JavaScript date object into a MySQL formatted datetime value
 * @param {Object} jsdate
 */
function jsDateToMySQLDate(jsdate){
    var year = jsdate.getFullYear();
    var month = (jsdate.getMonth() < 9 ? '0' : '') + (jsdate.getMonth() + 1);
    var day = (jsdate.getDate() < 10 ? '0' : '') + jsdate.getDate();
    var hour = (jsdate.getHours() < 10 ? '0' : '') + jsdate.getHours();
    var min = (jsdate.getMinutes() < 10 ? '0' : '') + jsdate.getMinutes();
    var sec = (jsdate.getSeconds() < 10 ? '0' : '') + jsdate.getSeconds();
    
    return year + '-' + month + '-' + day + ' ' + hour + ':' + min + ':' + sec;
}

/**
 * Called from client to retrieve a formatted server timestamp
 */
function getServerDatetime(){
	var jsdate = new Date();
	return jsDateToMySQLDate(jsdate);
}

getServerDatetime.proxy = true;

/**
 * Used to create a one way MD5 hash of a plain text password
 * @param {Object} plain_text_password
 */
function encryptPassword(plain_text_password){
    Jaxer.load("lib/md5/md5.js"); //External 3rd party MD5 library
    var encryptedPassword = hex_md5(plain_text_password);
    
    return encryptedPassword;
}

encryptPassword.proxy = true;

/**
 * Detects and reacts to enter/return keypress.  Calls user defined 
 * function on detection.
 * @param {Object} evt
 * @param {Object} handler
 */
function handleReturn(evt, handler){
    if (!evt) {
		evt = window.event;
	}
        
    if ((evt.which && evt.which === 13) || (evt.keyCode && evt.keyCode === 13)) {
        YAHOO.util.Event.preventDefault(evt);
        handler(evt);
        return false;
    }
}

handleReturn.runat = "client";
