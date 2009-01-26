/**
 * Collection of database and ActiveRecord related functionality
 * @author Chad Auld
 */
/**
 * Setup MySQL & ActiveRecord
 */
function setupActiveRecord(){
    var uniqueInstance;
    
    function constructor(){
        ActiveRecord.connect(ActiveRecord.Adapters.JaxerMySQL);
        ActiveRecord.logging = true;
    }
    
    return {
        getInstance: function(){
            if (!uniqueInstance) {
                uniqueInstance = constructor();
            }
            
            return uniqueInstance;
        }
    };
}

/**
 * Model Factory:
 * Retrieves or initiates an instance of ActiveRecord with our database connection.
 * Sets up the requested model and it's related functionality. Preferred over calling
 * a model directly.
 */
function getModel(tableName){
    setupActiveRecord().getInstance();
    var fName = eval(JSON.parse(JSON.stringify(tableName)));
    
    return fName();
}

/**
 * Base Model Definitions
 */
function User(){

    /*
     CREATE TABLE IF NOT EXISTS `users` (
     `id` int(11) NOT NULL auto_increment,
     `username` varchar(255),
     `password` varchar(255),
     `registration_date` datetime,
     PRIMARY KEY  (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
    var User = ActiveRecord.define('users', {
        username: '',
        password: '',
        registration_date: {
            type: 'DATETIME',
            value: ''
        }
    });
    
    User.afterCreate(function(user){
        Jaxer.Log.info('User with id of ' + user.id + ' was created.');
    });
    
    //Define relationships
    var message = getModel('Message');
    User.hasMany('Message');
    
    return User;
}

function Message(){

    /*
     CREATE TABLE  `messages` (
     `id` int(11) NOT NULL auto_increment,
     `chatroom_id` int(11),
     `username` varchar(255),
     `message_text` TEXT,
     `date_posted` datetime,
     PRIMARY KEY  (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
    var Message = ActiveRecord.define('messages', {
        chatroom_id: {
            type: 'INT',
            value: ''
        },
        username: '',
        message_text: {
            type: 'TEXT',
            value: ''
        },
        date_posted: {
            type: 'DATETIME',
            value: ''
        }
    });
    
    return Message;
}

function Chatroom(){

    /*
     CREATE TABLE  `chatrooms` (
     `id` int(11) NOT NULL auto_increment,
     `title` varchar(255),
     `description` varchar(255),
     `date_created` datetime,
     PRIMARY KEY  (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
    var Chatroom = ActiveRecord.define('chatrooms', {
        title: '',
        description: '',
        date_created: {
            type: 'DATETIME',
            value: ''
        }
    });
    
    Chatroom.afterCreate(function(chatroom){
        alert('Chatroom with id of ' + chatroom.id + ' was created.');
    });
    
    return Chatroom;
}

function UserChatroom(){

    /*
     CREATE TABLE  `users_chatrooms` (
     `id` int(11) NOT NULL auto_increment,
     `chatroom_id` int(11),
     `user_id` int(11),
     `last_message_received_id` int(11),
     `last_retrival_datetime` datetime,
     PRIMARY KEY  (`id`)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
     */
    var UserChatroom = ActiveRecord.define('users_chatrooms', {
        chatroom_id: {
            type: 'INT',
            value: ''
        },
        user_id: {
            type: 'INT',
            value: ''
        },
        last_message_received_id: {
            type: 'INT',
            value: ''
        },
        last_retrival_datetime: {
            type: 'DATETIME',
            value: ''
        }
    });
    
    return UserChatroom;
}

/**
 * End Model Definitions
 */

/**
 *  Test if username exists
 * @param {Object} username
 */
function usernameExists(username){
    var user = getModel("User");
    var userExists = user.findByUsername(username);
    
    if (typeof userExists === 'object' && typeof userExists.username !== 'undefined') {
        return true;
    }
    else {
        return false;
    }
}

usernameExists.proxy = true;

/**
 * Used to add new users to the system (i.e.) account regisitration
 * @param {Object} username
 * @param {Object} password
 */
function addNewUser(username, password){
    var encryptedPassword = encryptPassword(password);
    var now = new Date();
    var user = getModel("User");
    var newUser = user.create({
        username: username,
        password: encryptedPassword,
        registration_date: jsDateToMySQLDate(now)
    });
    
    return newUser.get('username');
}

addNewUser.proxy = true;

/**
 * Saves new chat message for specified chatroom
 * @param {Object} chatroomId
 * @param {Object} message
 * @param {Object} datePosted (MySQL formated datetime)
 */
function saveNewMessage(chatroomId, message, datePosted){
    var user = getAuthenticatedUser();
    var now = new Date();
    var messageModel = getModel('Message');
    var newPost = messageModel.create({
        chatroom_id: chatroomId,
        message_text: strip_tags(message),
        username: user.username,
        date_posted: datePosted
    });
}

saveNewMessage.proxy = true;

/**
 * Retrieves all new chat messages for the active user and specified
 * chatroom since the last retrieval.
 *
 * @param {Object} chatroomId
 */
function getNewMessagesForRoom(chatroomId){
    var user = getAuthenticatedUser();
    var now = new Date();
    var userChatroomModel = getModel('UserChatroom');
    var messageModel = getModel('Message');
    
    //First determine if they have fetched messages from this room previously
    var lastFetch = userChatroomModel.find({
		where: {
			chatroom_id: chatroomId,
			user_id: user.id
		},
        limit: 1
    });
    
    if (typeof lastFetch === 'object' && lastFetch.length > 0) {
        //This is not the first fetch
        var messages = messageModel.find({
            where: 'chatroom_id=' + chatroomId + ' AND id > ' + parseInt(lastFetch[0].last_message_received_id, 10) +
					' AND username <> \'' + user.username + '\'',
            order: 'id DESC'
        });
    }
    else {
        //This is the first fetch for this room (grab last 10 entries)
        var messages = messageModel.find({
            where: {
				chatroom_id: chatroomId
			},
            order: 'id DESC',
            limit: 10
        });
    }
    
    //Defaults to 0 when there are no newer messages
    var msgid = 0;
    if (typeof messages === 'object' && messages.length > 0) {
        msgid = messages[0].id;
        Jaxer.Log.info('No new messages');
    }
    
    //Identify max id and record for next fetch start position
    var now = new Date();
    if (typeof lastFetch === 'object' && lastFetch.length > 0) {
        //Do not update last_message_received_id if no new ones have come in
        if (msgid !== 0) {
            lastFetch[0].set('last_message_received_id', msgid);
        }
        lastFetch[0].set('last_retrival_datetime', jsDateToMySQLDate(now));
        lastFetch[0].save();
    }
    else {
        //This is the first fetch for this room (grab last 10 entries)
        userChatroomModel.create({
            chatroom_id: chatroomId,
            user_id: user.id,
            last_message_received_id: msgid,
            last_retrival_datetime: jsDateToMySQLDate(now)
        });
    }
    
    return messages;
}

getNewMessagesForRoom.proxy = true;

/**
 * Find all users that have been in a specific chatroom recently
 * Note: Revisit this one.  Should be simpler with relationships.
 *
 * @param {Object} chatroomId
 */
function getActiveUsersInChatroom(chatroomId){

    var userModel = getModel('User');
    var userChatroomModel = getModel('UserChatroom');
    var userIdsInRoom = userChatroomModel.find({
        where: "chatroom_id=" + chatroomId + " AND last_retrival_datetime >= DATE_SUB(NOW(), INTERVAL '1:0' MINUTE_SECOND)"
    });
    
    if (typeof userIdsInRoom === 'object' && userIdsInRoom.length > 0) {
        var i, usernamesInRoom = [];
        
        for (i = 0; i < userIdsInRoom.length; i++) {
            var user = userModel.find(userIdsInRoom[i].user_id);
            usernamesInRoom.push(user.username);
        }
    }
    else {
        return null;
    }
    
    return usernamesInRoom;
}

getActiveUsersInChatroom.proxy = true;

/**
 * Allows creation of new chatrooms
 * @param {Object} title
 * @param {Object} description
 */
function addNewChatroom(title, description){
    var now = new Date();
    var chatroomModel = getModel('Chatroom');
    var newChatroom = chatroomModel.create({
        title: strip_tags(title),
        description: strip_tags(description),
        date_created: jsDateToMySQLDate(now)
    });
    
    return newChatroom;
}

addNewChatroom.proxy = true;

/**
 * Find all chatrooms (or all chatrooms added since a specific one)
 * @param {Object} since
 */
function getChatrooms(since){
    var chatroomModel = getModel('Chatroom');
    
    if (typeof since !== 'undefined') {
        var chatrooms = chatroomModel.find({
            where: 'id > ' + parseInt(since, 10),
            order: 'id ASC'
        });
    }
    else {
        var chatrooms = chatroomModel.find({
            order: 'id ASC'
        });
    }
    
    return chatrooms;
}

getChatrooms.proxy = true;
