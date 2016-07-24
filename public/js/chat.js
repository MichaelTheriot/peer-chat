// reconnect if user still in list?
// disconnect if user not in list? or keep valid but mark as unverified??

window.addEventListener('load', function() {
  var chat = new EventEmitter();

  var peer;
  var username;
  var unread = 0;

  var resetNotifications, notifyUnread;
  (function() {
    var title = document.title;
    resetNotifications = function() {
      unread = 0;
      document.title = title;
    };
    notifyUnread = function() {
      unread++;
      document.title = '(' + unread + ') ' + title;
    };
  })();

  var writeMessage = (function() {
    var messages = document.querySelector('#messages');
    return function(arg1, arg2) {
      var e = document.createElement('p');
      if(arguments.length > 1) {
        var em = document.createElement('em');
        em.textContent = arg1 + ':';
        e.appendChild(em);
        e.appendChild(document.createTextNode(' ' + arg2));
      } else {
        e.appendChild(document.createTextNode(arg1));
      }
      var scrollPaused = (messages.scrollHeight - messages.scrollTop) !== messages.offsetHeight;
      messages.appendChild(e);
      if(document.hidden)
        notifyUnread();
      if(!scrollPaused)
        messages.scrollTop = messages.scrollHeight - messages.offsetHeight;
    };
  })();

  (function() {
    var audioPop = document.createElement('audio');
    audioPop.setAttribute('src', '/audio/blop.mp3');

    var userList = document.querySelector('#users ul');

    var addUser = function(id) {
      var li = document.createElement('li');
      li.setAttribute('data-uid', id);
      li.textContent = id;
      userList.appendChild(li);
      return li;
    };

    var addNewUser = function(id) {
      var li = addUser(id);
      writeMessage(id + ' connected');
      return li;
    };

    var removeUser = function(id) {
      var li = document.querySelector('#users li[data-uid="' + id + '"]');
      if(li) {
        li.parentNode.removeChild(li);
        writeMessage(id + ' disconnected');
      }
      return li;
    };

    chat.on('connected', function() {
      var li = addUser(username);
      li.setAttribute('class', 'me');
    });
    chat.on('disconnected', function() {
      //var e;
      //while(e = document.querySelector('#users li'))
        //e.parentNode.removeChild(e);
    });
    chat.on('addConnection', addUser);
    chat.on('newConnection', addNewUser);
    chat.on('dropConnection', removeUser);

    chat.on('receiveMessage', function(id, msg) {
      writeMessage(id, msg);
      if(document.hidden)
        audioPop.play();
    });

    var input = document.querySelector('#input');
    var validate = function() {
      if(input.value !== '') {// && !peer.disconnected) {
        chat.emitEvent('sendMessage', [input.value]);
        chat.emitEvent('receiveMessage', [username, input.value])
      }
      input.value = '';
      input.focus();
      return false;
    };
    var sendButton = document.querySelector('#send');
    sendButton.onclick = validate;
    input.onkeyup = function(e) {
      if(e.keyCode === 13)
        return validate();
    };
  })();

  var loginPanel = document.querySelector('#login');
  var loginButton = document.querySelector('#loginbutton');
  var inputLogin = document.querySelector('#inputlogin');

  var login = function(name) {
    if(peer)
      return;

    inputLogin.removeAttribute('class');

    peer = new Peer(name, {host: '/', port: 8080, path: '/peerjs'});

    var getMedia = (function() {
      return function(audio, video, success, callback) {
        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        getUserMedia({audio: audio, video: video}, success, callback);
      };
    })();

    var connectToUser = function(id) {
      var conn = peer.connect(id, {label: 'chat'});
      var sendListener = function(data) {
        conn.send(data);
      };
      conn.on('open', function() {
        chat.emitEvent('addConnection', [id]);
        chat.on('sendMessage', sendListener);
      });
      establishUser(conn, sendListener);
    };

    var establishUser = function(conn, sendListener) {
      conn.on('close', function() {
        chat.emitEvent('dropConnection', [conn.peer]);
        chat.off('sendMessage', sendListener);
      });
      conn.on('error', function() {
        chat.emitEvent('dropConnection', [conn.peer]);
        chat.off('sendMessage', sendListener);
        conn.close();
      });
      conn.on('data', function(data) {
        chat.emitEvent('receiveMessage', [conn.peer, data]);
      });
    };

    var init = function(id) {
      window.peer = peer;
      username = id;
      loginPanel.setAttribute('class', 'hidden');
      input.focus();
      chat.emitEvent('connected');
      peer.listAllPeers(function(list) {
        list.forEach(function(pId) {
          if(pId !== id)
            connectToUser(pId);
        });
      });

      peer.on('connection', function(call) {
        if(call.label === 'chat') {
          var sendListener = function(data) {
            call.send(data);
          };
          chat.emitEvent('newConnection', [call.peer]);
          chat.on('sendMessage', sendListener);
          establishUser(call, sendListener);
        }
      });
    };

    peer.on('open', init);
    peer.on('disconnected', function() {
      chat.emitEvent('disconnected');
    });

    peer.on('error', function(err) {
      switch(err.type) {
        case 'network':
          if(!peer.disconnected) {
            writeMessage('Lost connection to negotiation server. You are still connected to clients in the chat but will not be able to connect to new clients.');
            break;
          }
        case 'invalid-id':
        case 'unavailable-id':
        default:
          inputLogin.setAttribute('class', 'bad');
          loginPanel.removeAttribute('class');
          try {
            peer.destroy();
          } catch(e) {
            
          } finally {
            peer = undefined;
          }
          break;
      }
    });
  };

  loginButton.onclick = function() {
    if(inputLogin.value !== '')
      login(inputLogin.value);
  };

  inputLogin.onkeyup = function(e) {
    if(e.keyCode === 13)
      if(inputLogin.value !== '')
        login(inputLogin.value);
  };

  document.addEventListener('visibilitychange', function() {
    if(!document.hidden)
      resetNotifications();
  });

  inputLogin.focus();
});