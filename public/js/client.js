window.addEventListener('load', function() {

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var $status = document.querySelector('#status');

var myStream;

var msg = new EventEmitter();

function callSomeone(peer, id) {
  var conn = peer.connect(id, {label: 'chat'});
  var call = peer.call(id, myStream);
  var video;

  call.on('stream', function(stream) {
    video = addVideo(stream);
  });

  call.on('close', function() {
    if(video)
      video.parentNode.removeChild(video);
  });

  conn.on('open', function() {

    console.log('connection made');
    conn.send('TEST');

    conn.on('data', function(data) {
      console.log('receive <- ' + data);
      msg.emitEvent('receive', [id, data]);
    });

    var listener = function(data) {
      console.log('send -> ' + data);
      conn.send(data);
    };

    msg.on('send', listener);

    conn.on('close', function() {
      console.log('closed connection');
      msg.off('send', listener);
    });

  });

}

var vidContainer = document.querySelector('#vidcontainer');

function addVideo(stream, muted, options) {
  var container = document.createElement('div');
  container.setAttribute('class', 'video');
  var e = document.createElement('video');
  if(muted)
    e.setAttributeNode(document.createAttribute('muted'));
  e.setAttributeNode(document.createAttribute('autoplay'));
  e.setAttribute('src', URL.createObjectURL(stream));
  //if(!options.video)
    //container.setAttribute('class', 'video novideo');
  container.appendChild(e);
  vidContainer.appendChild(container);
  return container;
}

function enableChat(peer) {
  var textarea = document.querySelector('#chat textarea');
  var input = document.querySelector('#chat input');
  msg.on('receive', function(id, data) {
    textarea.innerHTML += id + ': ' + data + '\n';
  });
  input.onkeyup = function(e) {
    if(e.keyCode === 13) {
      msg.emitEvent('send', [input.value]);
      msg.emitEvent('receive', [peer.id, input.value]);
      input.value = '';
    }
  };
}

function join(audio, video) {
  var $buttonDiv = document.querySelector('#buttons');
  $buttonDiv.parentNode.removeChild($buttonDiv);

  var init = function(stream) {
    myStream = stream;
    addVideo(stream, true);
    $status.textContent = 'Connecting...';
    var peer = new Peer({host: '/', port: location.port || 80, path: '/peerjs'});
    peer.on('call', function(call) {
      call.answer(myStream);
      call.on('stream', function(stream) {
        video = addVideo(stream, false);
      });
    });
    peer.on('open', function() {
      $status.textContent = 'Connected';
      peer.listAllPeers(function(list) {
        list.forEach(function(id) {
          if(id !== peer.id)
            callSomeone(peer, id);
        });
      });

      enableChat(peer);
    });
    peer.on('disconnected', function() {
      $status.textContent = 'Disconnected from negotiation server';
    });
    peer.on('error', function(err) {
      console.log(err);
      $status.textContent = 'Error occurred';
    });
  };

  navigator.getUserMedia({audio: audio, video: video}, init,
    function() {
      $status.textContent = 'You rejected.';
    }
  );
}

document.querySelector('#btn1').onclick = function() { join(true, true); };
document.querySelector('#btn2').onclick = function() { join(true, false); };
//document.querySelector('#btn3').onclick = function() { join(false, false); };

});