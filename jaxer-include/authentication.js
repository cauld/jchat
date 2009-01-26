/**
 * Functions to handle user authentication, login, logout, etc
 * @author Chad Auld
 */

function initAuthentication(){
	try {
        var user = getAuthenticatedUser();
        if (user) {
            Jaxer.clientData.isAuthenticated = true;
        }
        else {
            Jaxer.clientData.isAuthenticated = false;
        }
    } 
    catch (e) {
        Jaxer.Log.error("Error trying to get authenticated user: " + e);
    }
}

function changeAuthentication(isAuthenticated){
    if (YAHOO.lang.isFunction(window.onAuthenticateChange)) {
		onAuthenticateChange(isAuthenticated);	
	}
}

changeAuthentication.runat = "client";

/**
 * Returns authenticated user object and/or null if user not authenticated
 */
function getAuthenticatedUser(){
    var username = Jaxer.session.username;
    if (typeof username === 'undefined') {
        return null;
    }
    else {
        var userModel = getModel("User");
        var user = userModel.findByUsername(username);
        
        if (typeof user === 'undefined') {
            return null;
        }
    }
    
    return user;
}

getAuthenticatedUser.proxy = true;

/**
 * Sets Jaxer session variable with authenticated user information
 * @param {Object} user
 */
function makeAuthenticated(user){
    Jaxer.session.username = user.username;
}

/**
 * Verifies users credentials against the database.  Used
 * by the login function.
 * @param {Object} username
 * @param {Object} password
 */
function checkCredentials(username, password){
    var userModel = getModel("User");
	var user = userModel.find({
		where: {
			username: username,
			password: password
		},
		limit: 1
	});
    
    if (typeof user[0] !== 'object' || typeof user[0].username === 'undefined') {
        return null;
    }
    
    makeAuthenticated(user[0]);
    return user[0].username;
}

checkCredentials.proxy = true;

/**
 * Destroy Jaxer session variables dealing with
 * authenticated user.  Used in the logout process.
 */
function removeCredentials(){
    delete Jaxer.session.username;
}

removeCredentials.proxy = true;

/**
 * Log authenticated user out of the system, change their status,
 * and destory their related session information.
 */
function logout(){
	var chatroomPage = YAHOO.util.Dom.getElementsByClassName('chatroom-page');
	YAHOO.util.Dom.setStyle(chatroomPage, 'display', 'none');
    var loginPage = YAHOO.util.Dom.getElementsByClassName('login-page');
    YAHOO.util.Dom.setStyle(loginPage, 'display', 'block');
	YAHOO.util.Dom.get('username').focus();
	
    changeAuthentication(false);
    removeCredentials();
}

logout.runat = "client";

/**
 * Checks user credentials, sets up the authenticated session,
 * and modifes visual display on successful login.
 */
function login(){
    var username = YAHOO.lang.trim(YAHOO.util.Dom.get('username').value);
    var password = YAHOO.lang.trim(YAHOO.util.Dom.get('password').value);
    
    //Validation checks
    var usernameCheck = validateUsername(username);
    var passwordCheck = validatePassword(password);
    if (usernameCheck !== '') {
        YAHOO.util.Dom.get('loginMessage').innerHTML = usernameCheck;
        return false;
    }
    else 
        if (passwordCheck !== '') {
            YAHOO.util.Dom.get('loginMessage').innerHTML = passwordCheck;
            return false;
        }
    
    var encryptedPassword = encryptPassword(password);
    var dbUsername = checkCredentials(username, encryptedPassword);
    if (dbUsername) {
        var loginPage = YAHOO.util.Dom.getElementsByClassName('login-page');
        YAHOO.util.Dom.setStyle(loginPage, 'display', 'none');
        changeAuthentication(true);
		
		//Cleanup the password and any old error messages so they not present on signout
		YAHOO.util.Dom.get('loginMessage').innerHTML = '';
		YAHOO.util.Dom.get('password').value = '';
		
	    jChat.postLoginInit();
    }
    else {
        YAHOO.util.Dom.get('loginMessage').innerHTML = 'Invalid login!  Please try again.';
        return false;
    }
    
	
}

login.runat = "client";

/**
 * Use to create new accounts for the application and verify
 * the data meets predefined formatting conditions.
 */
function doCreateAccount(){
    var username = YAHOO.lang.trim(YAHOO.util.Dom.get('new_username').value);
    var password = YAHOO.lang.trim(YAHOO.util.Dom.get('new_password').value);
    var confirmPassword = YAHOO.lang.trim(YAHOO.util.Dom.get('confirm_password').value);
    
    //Validation checks
    var usernameCheck = validateUsername(username);
    var passwordCheck = validatePassword(password);
    if (usernameCheck !== '') {
        YAHOO.util.Dom.get('newAccountMessage').innerHTML = usernameCheck;
        return false;
    }
    else 
        if (usernameExists(username) === true) {
            YAHOO.util.Dom.get('newAccountMessage').innerHTML = "Username already in use!  Please try another.";
            return false;
        }
        else 
            if (passwordCheck !== '') {
                YAHOO.util.Dom.get('newAccountMessage').innerHTML = passwordCheck;
                return false;
            }
            else 
                if (password !== confirmPassword) {
                    YAHOO.util.Dom.get('newAccountMessage').innerHTML = "Passwords do not match!  Please try again.";
                    return false;
                }
    
    var newUserResult = addNewUser(username, password);
    if (newUserResult) {
		//Cleanup the fields so they are not present on signout/create during the initial session
		YAHOO.util.Dom.get('new_username').value = '';
		YAHOO.util.Dom.get('new_password').value = '';
		YAHOO.util.Dom.get('confirm_password').value = '';
		
	    YAHOO.util.Dom.get('loginMessage').innerHTML = 'Account created successfully! Please login.';
		YAHOO.util.Dom.setStyle('registration-form', 'display', 'none');
		YAHOO.util.Dom.setStyle('login-form', 'display', 'block');
    }
    else {
        alert('Unable to create new user.  Please try again!');
        return false;
    }
}

doCreateAccount.runat = "client";

/**
 * Validates the entered username
 * @param {Object} candidate
 */
function validateUsername(candidate){
	var pattern = /^[\w\-]+$/;
    return pattern.test(candidate) ? "" : "Username must be alphanumeric or -";
}

validateUsername.runat = "both";

/**
 * Validates that the entered password
 * @param {Object} candidate
 */
function validatePassword(candidate){
	var pattern = /^[\w\-\$]{6,}$/;
    return pattern.test(candidate) ? "" : "Password must be 6 or more alphanumeric or - or $ characters";
}

validatePassword.runat = "both";
