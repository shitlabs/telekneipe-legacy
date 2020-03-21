
function init_tableservice() {

  // Global defines in tableservice namespace
  var localStream = null;
  var existingCalls = new Map();

  var positions = [{x:0, y:0},{x:266, y:0},{x:266*2, y:0},
          {x:0, y:266},{x:266, y:266},{x:266*2, y:266}];
  var allocated_slots = new Array(positions.length);
  allocated_slots.fill(false);

  var known_peers = [];
  var connected_peers = [];


  function newVideoFrame(stream) {
      //webcam to sprite
        let videoElement = document.createElement("video");         
        videoElement.autoplay = true;
        videoElement.playsinline = true;
        videoElement.srcObject = stream;
        videoElement.play();

        let frame = new PIXI.Sprite.from("pics/image_frame.png");
        frame.x = 0;
        //frame.y = app.renderer.height-235;
        frame.y = 0

        //let texture = PIXI.Texture.from();
        let videoSprite = PIXI.Sprite.from(videoElement);
        videoSprite.width = 182;
        videoSprite.height = 182;
        videoSprite.x =  27;
        //videoSprite.y = app.renderer.height-182-27;
        videoSprite.y = 27;
        //videoSprite.tint = 0xe0b888;
        
        let container = new PIXI.Container()
        container.addChild(frame);
        container.addChild(videoSprite);
    return [videoElement,container];
    }






  function cleanUpAvatar(call,elements) {
    elements[1].destroy();
    elements[0].parentNote.removeChild(elements[0]);
    allocated_slots[elements[2]] = false;
  }


  // create video element for webcam
  const webcamvideo = document.createElement("video");
  webcamvideo.muted = true;
  webcamvideo.preload = true;
  webcamvideo.autplay = true;
  webcamvideo.playsinline = true;


  // check if support is here
  var msg = '', seriouslyFail = Seriously.incompatible();
  if (seriouslyFail) {
    if (status === 'canvas') {
      msg = 'Your browser does not support HTML Canvas. Please consider upgrading.';
    } else if (status === 'webgl') {
      msg = 'Your browser does not support WebGL. Please try Firefox or Chrome.';
    } if (status === 'context') {
      msg = 'Your graphics hardware does not support WebGL. You may need to upgrade your drivers.';
    } else {
      msg = 'Unable to display content.'; //unknown error
    }
    //display error message, hide main content and display alternate content
    console.log(msg)
  } else {
    // setup Seriously effect chain for webcam video
    var seriously = new Seriously({active:true});
    var source = seriously.source(webcamvideo);
    var target = seriously.target('#canvas');
    var effects_out = {
      //"brightness-contrast": {}, // TODO: limit colorlevels
   	  pixelate: {
        pixelSize: [3,3],
      },
      "hue-saturation": {
      	saturation: -1,
      },
    };

    source.on('ready', function () {
      target.width = 128;
      target.height = 128;
    });

    var reformat = seriously.transform('reformat');
    reformat.source = source;
    reformat.width = 128;
    reformat.height = 128;
    reformat.mode = "cover";

    let in_source = reformat;
    // input postprocessing
    Object.keys(effects_out).forEach(function (key, index) {
      var effect = seriously.effect(key);
      var opts = effects_out[key];

      effect.source = in_source;
      effects_out[key] = effect;

      for (var k in opts) {
        if (opts.hasOwnProperty(k)) {
          effect[k] = opts[k];
        }
      }
      
      in_source = effect;
    });
    // this is what we want to stream out
    target.source = in_source;
  }



  //create a Pixi Application
  var app = new PIXI.Application({
    width: 800,         // default: 400
    height: 600,        // default: 400
    view: document.getElementById("screen")
  });


  function processCall (call) {
    // Wait for stream on the call, then set peer video display
    call.on('stream', function(stream){
      // BUG as per https://github.com/peers/peerjs/issues/609. Check if call.peer already in existingCalls, if so... ignore?
      if (existingCalls.has(call.peer)) return;

  
      let remotevideo,container;
      [remotevideo,container] = newVideoFrame(stream);


      // placement: Find free slot, get position
      let ind_slot = allocated_slots.findIndex(element => !element);
      
      container.x = positions[ind_slot].x
      container.y = positions[ind_slot].y;


      app.stage.addChild(container);

      // mark slot as used
      allocated_slots[ind_slot] = true;
      // insert entry into existingCalls
      existingCalls.set(call.peer,[remotevideo,container,ind_slot]);

    });


    // Register destructor
    call.on('close', function() {
      cleanUpAvatar(call.peer,existingCalls.get(call.peer));
      existingCalls.delete(call);
    });


    // Display remote ID (TODO: This will only display last connection, probably we won't use it anyways)
    //$('#their-id').text(call.peer);



    $('#step1, #step2').hide();
    $('#step3').show();
  }


  function initWebcamStream () {
    // Get audio/video stream
    const constraints = {
      video: {
        facingMode: 'user',
        aspectRatio: { ideal: 1 },
        height: { min: 240, ideal: 360, max: 360 },
        //frameRate: { ideal: 15},
      },
      audio: {
        echoCancellation: true}
      };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      webcamvideo.srcObject = stream;
      webcamvideo.play();

      if (!seriouslyFail && canvas.captureStream) {
        // video effects are supported
        seriously.go();
        // mix streams for audio forwarding
        localStream = canvas.captureStream();
        localStream.addTrack(stream.getAudioTracks()[0]);

      } else {
        // they are not, just capture webcam img. as fallback
        localStream = stream;          
      }

      // create loopback video element and sprite
      const [localvideoElement, localcontainer] = newVideoFrame(localStream);
      localvideoElement.muted = true;
  
      //sprite to canvas
      localcontainer.y = app.renderer.height-235;
      localcontainer.x = 0;
      app.stage.addChild(localcontainer);



      $("#step1").hide();
    })
    .catch(error => {
        console.error("Error accessing media devices.", error);
        $("#step1-error").show();
      });

  }






  // PeerJS object
  var peer = new Peer({ host: "peer.telekneipe.de", secure:true, path:"/peerjs", debug:3, config: {'iceServers': [
    { url: 'stun:stun.l.google.com:19302' } // Pass in optional STUN and TURN server for maximum network compatibility
  ]}});


  // Register Remote Callbacks
  // Output remotely assigned ID  
  peer.on('open', function(){
    $('#my-id').text(peer.id);
  });

  // Receive connection request
  peer.on('connection', (conn) => {
  	// TODO: Ask user for connection permission?
  	conn.on('open', () => {
      console.log("Sending connected_peers");
      console.log(connected_peers);
  		conn.send(connected_peers);
  	});
  	
  });

  // Receiving a call
  peer.on('call', function(call){
    // Answer the call automatically (instead of prompting user) for demo purposes
    if (localStream == null) {
      // do some emergency display action
      // TODO
    }
    call.answer(localStream);
    if (!connected_peers.includes(call.peer)) {
    		connected_peers.push(call.peer);
    }
    processCall(call);
  });

  peer.on('error', function(err){
    alert(err.message);
    // Clean up our state and UI when error occurs? 
    // Hard to say on which call the error occured though :(
  });



  // Register UI events. Function will evaluate after load.
  $(function(){
    $('#make-call').click(function(){
      // display our scene
      $('#table_container').show();
      // hide callpad
      $('#call_pad').hide();
    	// Open a data connection    	
    	let connection = peer.connect($('#callto-id').val());
    	connection.on('open',() => {
    		connection.on('data',(data) => {
          let people_to_call = [$('#callto-id').val()];
          console.log("Received connected peers from remote");
    			console.log(data);
    			for (var new_peer in data) {
    				if (!connected_peers.includes(new_peer) && (new_peer != peer.id)) {
    					people_to_call.push(new_peer);
    				}
    			}
          // for now close the connection, once we've received a list of peers,
          // there is no need to keep the data connection open.
          // This might change, when we introduce more functions
          // Then: Keep track of connection and it might make sense to keep it open.
          connection.close();    			
          // Initiate the calls!
          for (var call_this_peer in people_to_call) {
            console.log("Calling new peer");
            console.log(call_this_peer);
            let call = peer.call(call_this_peer, localStream);

            processCall(call);
          }

    		});     		
    	});

    });

    // Retry if getUserMedia fails
    $('#step1-retry').click(function(){
      $('#step1-error').hide();
      initWebcamStream();
    });




    // bind events triggered from fabulation
    // these should bubble up to the content-class div #catch_events
    $('#catch_events').on("tableservice.host", function() {
      if (!localStream) {
        $("#step1").show()
        initWebcamStream();
      }
      // display our scene      
      $('#table_container').show();
      // maybe set text so that it's clear what the table's name is?

    });

    $('#catch_events').on("tableservice.call", function() {
      if (!localStream) {
        $("#step1").show()        
        initWebcamStream();
      }

      // display the call screen
      $('#call_pad').show();

    });

    $('#catch_events').on("tableservice.hide_call", function() {
      $("#step1").hide()        
      $('#call_pad').hide();

    });

    $('#catch_events').on("tableservice.end", function() {
      // end call
      for (let [key, value] of existingCalls) {
        cleanUpAvatar(key,value);
        // end call
        key.close();
        // remove element
        existingCalls.delete(key);
      }
      connected_peers = [];
      // hide 
      $('#table_container').hide();      
    });




  });



}

