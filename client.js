/**
 * Handles most of the client side interacts (i.e.) events, animations, dialogs, timers, etc
 * @author Chad Auld
 */

var jChat = function(){

    var chatroomRefreshTimer, messageRefreshTimer, userlistRefreshTimer;
    
    /**
     * Animates the opening and closing of accordian sections
     * @param {Object} section (element to open/close)
     * @param {Object} height
     */
    function doChatroomAnim(section, chatroomId, crtHeight){
        var openAnimProps = {
            height: {
                to: 400
            }
        };
        var closeAminProps = {
            height: {
                to: 0
            }
        };
		
		//Close any other open sections (we only want 1 room at a time)
		var i;
		var accordianSections = YAHOO.util.Dom.getElementsByClassName("chatroom");
        for (i = 0; i < accordianSections.length; i++) {
            //Define and run the animation
            var closeAnim = new YAHOO.util.Anim(accordianSections[i], closeAminProps, 0.5);
            closeAnim.animate();
            YAHOO.util.Dom.setStyle(accordianSections[i], 'display', 'none');
            //Hide chat entry area until next open call
            var chatLog = YAHOO.util.Selector.query('#' + section.id + ' .chatlog');
            var chatEntry = YAHOO.util.Selector.query('#' + section.id + ' .chat_entry');
            YAHOO.util.Dom.setStyle(chatLog, 'visibility', 'hidden');
            YAHOO.util.Dom.setStyle(chatEntry, 'visibility', 'hidden');
        }
        
        //If the clicked section is closed then open it
        if (crtHeight === '0px') {
            //Define and run the animation
			YAHOO.util.Dom.setStyle(section, 'display', 'block');
            
			var openAnim = new YAHOO.util.Anim(section, openAnimProps, 1.25, YAHOO.util.Easing.bounceOut);
            openAnim.onStart.subscribe(function(){
				//Stop message fetcher while animating
				if (!YAHOO.lang.isUndefined(messageRefreshTimer)) {
			        clearInterval(messageRefreshTimer);
			    }
            });
			
			openAnim.onComplete.subscribe(function(){
                //Display chat entry area after chatroom is fully opened
                var chatLog = YAHOO.util.Selector.query('#' + section.id + ' .chatlog');
                var chatEntry = YAHOO.util.Selector.query('#' + section.id + ' .chat_entry');
                var chatEntryBox = YAHOO.util.Selector.query('div textarea', section, true);
                YAHOO.util.Dom.setStyle(chatLog, 'visibility', 'visible');
                YAHOO.util.Dom.setStyle(chatEntry, 'visibility', 'visible');
                
                chatEntryBox.focus();
				
				//Start fetchers for newly opened chatroom
				jChat.doMessageFetcher(chatroomId);
                jChat.doUserlistFetcher(chatroomId);
				doChatroomScroll(YAHOO.util.Dom.getFirstChild(chatLog));
            });
            
            openAnim.animate();
        }
    }
    
    /**
     * Used to bring the latest chat message(s) into view
     * @param {Object} chatlogNodeToScroll
     */
	function doChatroomScroll(chatlogNodeToScroll) {
		chatlogNodeToScroll.scrollTop = chatlogNodeToScroll.scrollHeight;
	}
    
    /**
     * Used to create a new DOM element
     * @param {Object} elem - Type if element to create (ex) div
     */
    function create(elem){
        return document.createElementNS ? document.createElementNS('http://www.w3.org/1999/xhtml', elem) : document.createElement(elem);
    }
    
    /**
     * Used to remove a DOM element
     * @param {Object} elem - Type if element to create (ex) div
     */
    function remove(elem){
        var el = YAHOO.util.Dom.get(elem);
        el.parentNode.removeChild(el);
    }
    
    /**
     * Search for a specific element within an array. Emulates PHP's in_array function.
     * @param {Object} needle
     * @param {Object} haystack
     */
    function in_array(needle, haystack){
        for (var i = 0; i < haystack.length; i++) {
            if (haystack[i] === needle) {
                return true;
            }
        }
        return false;
    }
	
	/**
	 * Used to stop all chat timers.  Called during logout.
	 */
	function stopAllTimers() {
		if (!YAHOO.lang.isUndefined(messageRefreshTimer)) {
	        clearInterval(messageRefreshTimer);
	    }
	    if (!YAHOO.lang.isUndefined(chatroomRefreshTimer)) {
	        clearInterval(chatroomRefreshTimer);
	    }
	    if (!YAHOO.lang.isUndefined(userlistRefreshTimer)) {
	        clearInterval(userlistRefreshTimer);
	    }
	}
    
    return {
        /**
         * We have a listener on the entire chat area and will use event delegation
         * to determine of the element clicked is of interest (ie) a chatroom button.
         * @param {Object} e
         */
        chatContainerClick: function(e){
            var eltarget = YAHOO.util.Event.getTarget(e);
            var sectionOfInterest = YAHOO.util.Dom.hasClass(eltarget, "chatroom-header");
            
            if (sectionOfInterest === true) {
                //Get the element to open/close
                var section = YAHOO.util.Dom.getNextSibling(eltarget.id);
                var chatroomId = parseInt(section.id.split("__")[1], 10);
                var chatroomArea = YAHOO.util.Dom.get('chatroom__' + chatroomId + '__details');
                var chatroomHeight = YAHOO.util.Dom.getStyle(chatroomArea, "height");
                
                //If it is currently 0px then it will be animating open, otherwise close it up
                doChatroomAnim(section, chatroomId, chatroomHeight);
                if (chatroomHeight !== '0px') {
                    clearInterval(messageRefreshTimer);
                    clearInterval(userlistRefreshTimer);
                    YAHOO.util.Dom.get("userlist").innerHTML = '';
                }
            }
        },
        /**
         Deals with the fetching of new chatroom messages
         * @param {Object} chatroomId
         */
        doMessageFetcher: function(chatroomId){
            //Setup the message fetcher for newly activated chatroom
            if (!YAHOO.lang.isUndefined(messageRefreshTimer)) {
                //Stop previously active chatroom fetcher
                clearInterval(messageRefreshTimer);
            }
            
            //Call immediately and schedule future runs
            jChat.chatroomMessageHandler(chatroomId);
            messageRefreshTimer = setInterval("jChat.chatroomMessageHandler(" + chatroomId + ")", 3000);
        },
        /**
         Deals with the fetching/updating of active users in chatroom list
         * @param {Object} chatroomId
         */
        doUserlistFetcher: function(chatroomId){
            //Setup the userlist fetcher for newly activated chatroom
            if (!YAHOO.lang.isUndefined(userlistRefreshTimer)) {
                //Stop previously active chatroom fetcher
                clearInterval(userlistRefreshTimer);
            }
            
            //Call immediately and schedule future runs
            jChat.userlistUpdateHandler(chatroomId);
            userlistRefreshTimer = setInterval("jChat.userlistUpdateHandler(" + chatroomId + ")", 10000);
        },
        /**
         * Checks for new messages in active chatroom and adds to chatlog as needed
         * @param {Object} chatroomId
         */
        chatroomMessageHandler: function(chatroomId){
            var activeChatlogList = YAHOO.util.Dom.getFirstChild(YAHOO.util.Dom.get("chatroom__" + chatroomId + "__details"));
            var newMessages = getNewMessagesForRoom(chatroomId);
            
            if (YAHOO.lang.isObject(newMessages) && newMessages.length > 0) {
                for (var i = newMessages.length - 1; i >= 0; i--) {
                    //Add new message to chatlog
                    var lastLi = YAHOO.util.Dom.getLastChild(activeChatlogList) || 'undefined';
					var datePosted = (newMessages[i].date_posted.replace(/Date:/, "Date: ")).replace(/T/, " ");
                    var headerToAdd = newMessages[i].username + ' ' + datePosted;
                    var messageToAdd = newMessages[i].message_text.replace(/((\w+):\/\/[\S]+\b)/gim, '<a class="jchat_link" href="$1" target="_blank">$1</a>');
                    
                    if (lastLi !== 'undefined') {
                        var newLiHeader = create("li");
                        YAHOO.util.Dom.addClass(newLiHeader, 'chat-other-header');
                        var newLiBody = create("li");
                        YAHOO.util.Dom.addClass(newLiBody, 'chat-other-message');
                        newLiHeader.innerHTML = headerToAdd;
                        newLiBody.innerHTML = messageToAdd;
                        YAHOO.util.Dom.insertAfter(newLiBody, lastLi);
                        YAHOO.util.Dom.insertAfter(newLiHeader, lastLi);
                    }
                    else {
                        activeChatlogList.innerHTML = '<li class="chat-other-header">' + headerToAdd + '</li>' +
                        								'<li class="chat-other-message">' + messageToAdd + '</li>';
                    }
                }
				doChatroomScroll(activeChatlogList);
            }
        },
        /**
         * Checks for new messages in active chatroom and adds to chatlog as needed
         * @param {Object} chatroomId
         */
        userlistUpdateHandler: function(chatroomId){
            var userlist = YAHOO.util.Dom.get("userlist");
            var crtChatroomUsers = getActiveUsersInChatroom(chatroomId);
            var extChatroomNodes = YAHOO.util.Dom.getChildren(userlist);
            
            //Add new users to the list as needed
            if (YAHOO.lang.isObject(crtChatroomUsers) && crtChatroomUsers.length > 0) {
                var i;
                for (i = 0; i < crtChatroomUsers.length; i++) {
                    if (YAHOO.util.Dom.get(crtChatroomUsers[i]) === null) {
                        //User not current li list so lets add them
                        if (YAHOO.lang.isObject(extChatroomNodes) && extChatroomNodes.length > 0) {
                            var newUser = create("li");
                            newUser.id = crtChatroomUsers[i];
                            newUser.innerHTML = crtChatroomUsers[i];
                            YAHOO.util.Dom.insertAfter(newUser, YAHOO.util.Dom.getLastChild(userlist));
                        }
                        else {
                            //This is the first user
                            userlist.innerHTML = '<li id="' + crtChatroomUsers[i] + '">' + crtChatroomUsers[i] + '</li>';
                        }
                    }
                }
            }
            
            //Remove users from the list as needed
            if (YAHOO.lang.isObject(extChatroomNodes) && extChatroomNodes.length > 0) {
                var j;
                for (j = 0; j < extChatroomNodes.length; j++) {
                    if (in_array(extChatroomNodes[j].id, crtChatroomUsers) === false) {
                        //This is is no longer in the chatroom
                        remove(extChatroomNodes[j].id);
                    }
                }
            }
        },
        /**
         * Responsible for getting a new chat message into the right chatlog and passing
         * the message off to the database for storage.
         * @param {Object} e
         */
        chatSubmitHandler: function(e){
            YAHOO.util.Event.preventDefault(e); //Stop the normal form submit so we can hand off to a proxy
            var eltarget = YAHOO.util.Event.getTarget(e);
            var usedReturnKey = YAHOO.util.Dom.hasClass(eltarget, 'chat-textarea');
            var chatlogList, chatMessageNode;
			
            if (usedReturnKey === false) {
                //The post message button was used
                chatlogList = YAHOO.util.Dom.getPreviousSibling(eltarget.parentNode);
                chatMessageNode = YAHOO.util.Dom.getPreviousSibling(YAHOO.util.Dom.getLastChild(eltarget));
            }
            else {
                //Used posed message via the return/enter key
                chatlogList = YAHOO.util.Dom.getPreviousSibling(eltarget.parentNode.parentNode);
                chatMessageNode = eltarget;
            }
            
            var chatMessage = strip_tags(YAHOO.lang.trim(chatMessageNode.value));
            if (chatMessage !== '') {
                //Reset for next message
                chatMessageNode.value = '';
                chatMessageNode.focus();
                
                //Identify chatroom id, update client display, and store post
				var user = getAuthenticatedUser();
                var chatroomId = chatlogList.parentNode.id.split("__")[1];
				var lastLi = YAHOO.util.Dom.getLastChild(chatlogList) || 'undefined';
				var datePosted = getServerDatetime();
                var headerToAdd = user.username + ' ~Date: ' + datePosted + '~';
                var messageToAdd = chatMessage.replace(/((\w+):\/\/[\S]+\b)/gim, '<a class="jchat_link" href="$1" target="_blank">$1</a>');
				
                if (lastLi !== 'undefined') {
                    var newLiHeader = create("li");
                    YAHOO.util.Dom.addClass(newLiHeader, 'chat-self-header');
                    var newLiBody = create("li");
                    YAHOO.util.Dom.addClass(newLiBody, 'chat-self-message');
                    newLiHeader.innerHTML = headerToAdd;
                    newLiBody.innerHTML = messageToAdd;
                    YAHOO.util.Dom.insertAfter(newLiBody, lastLi);
                    YAHOO.util.Dom.insertAfter(newLiHeader, lastLi);
                }
                else {
                    chatlogList.innerHTML = '<li class="chat-self-header">' + headerToAdd + '</li>' +
                    								'<li class="chat-self-message">' + messageToAdd + '</li>';
                }
				
				doChatroomScroll(chatlogList);
                saveNewMessage(chatroomId, chatMessage, datePosted);
            }
        },
        /**
         * Used to add new chatroom section(s)
         */
        addChatroomsToContainer: function(chatroom){
            var i;
            for (i = 0; i < chatroom.length; i++) {
                var newChatroomDiv = create("div");
                YAHOO.util.Dom.addClass(newChatroomDiv, 'yui-g');
                newChatroomDiv.innerHTML = '<div id="chatroom__' + chatroom[i].id + '" class="chatroom-header">' + chatroom[i].title + '</div>' +
                '	<div id="chatroom__' + chatroom[i].id + '__details" class="chatroom" style="display: none; height: 0px;">' +
                '		<ul class="chatlog">' +
                '		</ul>' +
                '		<div id="chatroom__' + chatroom[i].id + '" class="chat_entry">' +
                '			<form class="chat_form" method="post" action="index.html">' +
                '				<label>Enter chat message:</label><br />' +
                '				<textarea class="chat-textarea" onkeypress="handleReturn(event, jChat.chatSubmitHandler);"></textarea>' +
                '				<span style="margin-top: 3px;" class="yui-button yui-submit-button">' +
                '					<span class="first-child">' +
                '						<button type="submit">Post Message</button> ' +
                '					</span>' +
                '				</span>' +
                '			</form>' +
                '		</div>' +
                '	</div>' +
                '</div>';
                
                //New chatrooms are added at the bottom of the list so find the last
                var lastChatroom = YAHOO.util.Dom.getLastChild('chatroom_container');
                YAHOO.util.Dom.insertAfter(newChatroomDiv, lastChatroom);
            }
        },
        /**
         * Used to update the chatroom list for a user.  This is run at set intervals and
         * is called after active user manually adds new room.
         */
        updateChatroomList: function(){
            //Determine last chatroom fetched and grab any new ones added since then.
            //If this is the first call then grab then all.
            var lastChatroomId;
            var chatroomHeaders = YAHOO.util.Dom.getElementsByClassName("chatroom-header");
            var countOfChatrooms = chatroomHeaders.length;
            if (countOfChatrooms > 0) {
                lastChatroomId = chatroomHeaders[countOfChatrooms - 1].id.split("__")[1];
            }
            
            var chatrooms = getChatrooms(lastChatroomId);
            if (YAHOO.lang.isObject(chatrooms) && chatrooms.length > 0) {
                jChat.addChatroomsToContainer(chatrooms);
            }
        },
        /**
         * Sets up the add chatroom dialog container
         */
        addChatroomDialog: function(){
            //Define various event handlers for Dialog
            var handleSubmit = function(){
                var formData = this.getData();
                var title = formData.chatroom_title;
                var desc  = formData.chatroom_description;
                
                if (title === '') {
                    alert("Please enter a valid title!");
                    return false;
                }
                else {
                    var newChatroom = addNewChatroom(title, desc);
                    if (YAHOO.lang.isObject(newChatroom)) {
                        //Clear the original chatroom updater and fire update immediately
                        clearInterval(chatroomRefreshTimer);
                        jChat.updateChatroomList();
                        //Restart interval fetcher
                        chatroomRefreshTimer = setInterval("jChat.updateChatroomList()", 10000);
                        //Close the dialog
                        YAHOO.util.Dom.get("chatroom_title").value = '';
                        YAHOO.util.Dom.get("chatroom_description").value = '';
                        this.submit();
                    }
                    else {
                        alert('Unable to create chatroom!  Please try again.');
                    }
                }
            };
            var handleCancel = function(){
                this.cancel();
            };
            var handleSuccess = function(o){
            };
            var handleFailure = function(o){
                alert('Unable to create chatroom!  Please try again.');
            };
            
            //Instantiate the Dialog
            var add_chatroom_dialog = new YAHOO.widget.Dialog("add_chatroom_dialog", {
                width: "325px",
                fixedcenter: true,
                visible: false,
                constraintoviewport: true,
                buttons: [{
                    text: "Submit",
                    handler: handleSubmit,
                    isDefault: true
                }, {
                    text: "Cancel",
                    handler: handleCancel
                }]
            });
            
            //Wire up the success and failure handlers
            add_chatroom_dialog.callback = {
                success: handleSuccess,
                failure: handleFailure
            };
            
            //Render the Dialog
            add_chatroom_dialog.render();
            YAHOO.util.Event.addListener("add_new_chatroom", "click", function(e){
                YAHOO.util.Event.preventDefault(e);
            });
			YAHOO.util.Event.addListener("chatroom_title", "keypress", function(e){
				if (e.keyCode && e.keyCode === 13) {
        			YAHOO.util.Event.preventDefault(e);
				}
            });
			
            YAHOO.util.Event.addListener("add_new_chatroom", "click", add_chatroom_dialog.show, add_chatroom_dialog, true);
        },
        /**
         * Initializations to be done after successful login
         */
        postLoginInit: function(){
			var i;
			var chatroomBlock = YAHOO.util.Dom.getElementsByClassName("chatroom-page");
			var accordianSections = YAHOO.util.Dom.getElementsByClassName("chatroom");
	        YAHOO.util.Dom.get('welcome_message').innerHTML = 'Welcome, ' + getAuthenticatedUser().username;
			YAHOO.util.Dom.get("jaxer_build").innerHTML = 'Build #: ' + getJaxerBuild();
			
			//Since we do not start fetchers until a room is selected assure all rooms
			//start in the closed position and that the userlist is empty when the application loads
			for (i = 0; i < accordianSections.length; i++) {
	            //Define and run the animation
	            YAHOO.util.Dom.setStyle(accordianSections[i], 'height', '0px');
	            YAHOO.util.Dom.setStyle(accordianSections[i], 'display', 'none');
	        }
			
			YAHOO.util.Dom.get("userlist").innerHTML = '';
	        YAHOO.util.Dom.setStyle(chatroomBlock, 'display', 'block');
			
			//Setup our add chatroom button and overlay dialog
			var addChatroomButton = new YAHOO.widget.Button("add_new_chatroom");
			jChat.addChatroomDialog();
		
            //Load chatrooms and setup refresh timer
            jChat.updateChatroomList();
            chatroomRefreshTimer = setInterval("jChat.updateChatroomList()", 10000);
            
            //Setup additional event listeners
            var chatroomForms = YAHOO.util.Dom.getElementsByClassName("chat_form");
            YAHOO.util.Event.addListener(chatroomForms, 'submit', function(e){
                jChat.chatSubmitHandler(e);
            });
            
            YAHOO.util.Event.addListener('chatroom_container', "click", function(e){
                jChat.chatContainerClick(e);
            });
            
            YAHOO.util.Event.addListener('signout', "click", function(e){
                YAHOO.util.Event.preventDefault(e);
				//Remove old timers (if active)
    			stopAllTimers();
                logout();
            });
        } 
    };
}();

YAHOO.util.Event.on(window, 'load', function() {
	//If logged in setup the chatroom, else display the login form
	if (!YAHOO.lang.isUndefined(Jaxer.clientData) && Jaxer.clientData.isAuthenticated === true) {
		jChat.postLoginInit();
    }
    else {		
		var loginBlock = YAHOO.util.Dom.getElementsByClassName("login-page");
		YAHOO.util.Dom.setStyle(loginBlock, 'display', 'block');
		YAHOO.util.Dom.get('username').focus();
	}
	
	YAHOO.util.Event.addListener('create-new-account', "click", function(e){
		YAHOO.util.Event.preventDefault(e);
		YAHOO.util.Dom.get('loginMessage').innerHTML = ''; //Clear any old errors
		YAHOO.util.Dom.setStyle('login-form', 'display', 'none');
		YAHOO.util.Dom.setStyle('registration-form', 'display', 'block');
		YAHOO.util.Dom.get("new_username").focus();
	});
	
	YAHOO.util.Event.addListener('cancel-registration', "click", function(e){
		YAHOO.util.Event.preventDefault(e);
		YAHOO.util.Dom.get('loginMessage').innerHTML = ''; //Clear any old errors
		YAHOO.util.Dom.setStyle('registration-form', 'display', 'none');
		YAHOO.util.Dom.setStyle('login-form', 'display', 'block');
		YAHOO.util.Dom.get("username").focus();
	});
	
	YAHOO.util.Event.addListener('user-login', "click", function(e){
		YAHOO.util.Event.preventDefault(e);
		login();
	});
	
	YAHOO.util.Event.addListener('username', "keypress", function(e){
		handleReturn(e, login);
	});
	
	YAHOO.util.Event.addListener('password', "keypress", function(e){
		handleReturn(e, login);
	});
	
	YAHOO.util.Event.addListener('create-account', "click", function(e){
		YAHOO.util.Event.preventDefault(e);
		doCreateAccount();
	});
	
	YAHOO.util.Event.addListener('new_username', "keypress", function(e){
		handleReturn(e, doCreateAccount);
	});
	
	YAHOO.util.Event.addListener('new_password', "keypress", function(e){
		handleReturn(e, doCreateAccount);
	});
	
	YAHOO.util.Event.addListener('confirm_password', "keypress", function(e){
		handleReturn(e, doCreateAccount);
	});
});
