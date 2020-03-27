
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


  const smallBitFont = new PIXI.TextStyle({
    fontFamily: ["Press Start 2P", "Courier New"],
    fontStyle: "small-caps",
    fontSize: 9,
    wordWrap: true,
    wordWrapWidth: 2
  });

  const FrameTexture = PIXI.Texture.from("pics/image_frame.png");
  const FrameTexture_Filled = PIXI.Texture.from("pics/image_frame_filled.png");
  const FrameVolIcon = PIXI.Texture.from("pics/volume.png");
  const FrameMuteIcon = PIXI.Texture.from("pics/volume_mute.png");
  const VideoIcon = PIXI.Texture.from("pics/video.png");
  const VideoMuteIcon = PIXI.Texture.from("pics/video_mute.png");


  class VideoFrame {
    constructor(stream,selfie = false,peerId=null) {
      this.remoteId = peerId;
      this.slotIndex = null;

      this.selfie = selfie

      this._stream = stream;
      //webcam to sprite
      this.videoElement = document.createElement("video");         
      this.videoElement.autoplay = true;
      this.videoElement.playsinline = true;
      this.videoElement.srcObject = this._stream;
      this.videoElement.play();

      let frame = new PIXI.Sprite(FrameTexture);
      frame.x = 0;
      //frame.y = app.renderer.height-235;
      frame.y = 0

      //let texture = PIXI.Texture.from();
      let videoSprite = PIXI.Sprite.from(this.videoElement);
      videoSprite.width = 182;
      videoSprite.height = 182;
      videoSprite.x =  27;
      //videoSprite.y = app.renderer.height-182-27;
      videoSprite.y = 27;
      videoSprite.tint = 0xe0b888;
      if (this.selfie) videoSprite.texture.rotate = 12;

      this.backsideContainer = new PIXI.Container();

      let overlaySprite = new PIXI.Sprite(FrameTexture_Filled);
      overlaySprite.x = 0;
      overlaySprite.y = 0;

      this.backsideContainer.addChild(overlaySprite);

      this.muteButton = new PIXI.Sprite(FrameVolIcon);
      this.muteButton.interactive = true;
      this.muteButton.buttonMode = true;
      this.muteButton.x = 185;
      this.muteButton.y = 30;
      this.muteButton.on("pointerdown",this.toggleMute.bind(this));


      if (this.selfie) {
        this.videoMuteButton = new PIXI.Sprite(VideoIcon);
        this.videoMuteButton.interactive = true;
        this.videoMuteButton.buttonMode = true;
        this.videoMuteButton.x = 30;
        this.videoMuteButton.y = 30;
        this.videoMuteButton.on("pointerdown",this.videoMute.bind(this));

        this.backsideContainer.addChild(videoMuteButton);

      } else {
        if (this.remoteId) {
          let textId = new PIXI.Text(this.remoteId, smallBitFont);
          textId.x = 30;
          textId.y = 30;
          this.backsideContainer.addChild(textId);
        }
      }


      this.backsideContainer.addChild(this.muteButton); // add late to keep in front.


      this.backsideContainer.visible = false;
      
      this.container = new PIXI.Container()
      this.container.addChild(frame);
      this.container.addChild(videoSprite);
      this.container.addChild(this.backsideContainer);

      // event registration
      this.container.interactive = true;
      this.container.on('pointerover', this._showBack.bind(this))
        .on('pointerout', this._hideBack.bind(this));

      this._internalVolume = 100;
    }

    _showBack() {
      this.backsideContainer.visible = true;
    }

    _hideBack() {
      this.backsideContainer.visible = false;
    }

    toggleMute() {
      let state = false;
      if (this.selfie) {
        this._stream.getAudioTracks()[0].enabled = !this._stream.getAudioTracks()[0].enabled;
        state = !this._stream.getAudioTracks()[0].enabled;
      } else {
        this.videoElement.muted = !this.videoElement.muted;
        state = this.videoElement.muted;
      }
      this.muteButton.texture = state ? FrameMuteIcon : FrameVolIcon;
    }

    videoMute() {
      this._stream.getVideoTracks()[0].enabled = !this._stream.getVideoTracks()[0].enabled;
      this.videoButton.texture = this._stream.getVideoTracks()[0].enabled ? VideoIcon : VideoMuteIcon;
    }

    set volume(val) {
      this.videoElement.volume = val;
    }

    get volume() {
      this.videoElement.volume;
    }

    duck(vol=10) {
      this._internalVolume = this.volume;
      this.volume = vol;
    }

    unduck() {
      this.volume = this._internalVolume;
    }



  }


  function logToReceipt(msg) {
    $("#console").prepend(`<div class="msg">${msg}</div>`);
    // make the button flash
    $("#receiptButton").fadeOut("fast",function() {$("#receiptButton").fadeIn(); });
  }




  function cleanUpAvatar(call,instance) {
    if (instance != undefined) {
      if (instance.slotIndex>=0) {
        allocated_slots[instance.slotIndex] = false;
      }    
      delete instance;
    }
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

  // never not be pixely :)
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

  function showReceipt() {
    $(".receipt").show();
  }

  function processCall (call) {
    // Wait for stream on the call, then set peer video display
    call.on('stream', function(stream){
      // BUG as per https://github.com/peers/peerjs/issues/609. Check if call.peer already in existingCalls, if so... ignore?
      // TODO: This might be a bad decision, since we might get a re-call try from our peer, which would be ignored here? Investigate.
      //if (existingCalls.has(call.peer)) return;
      // TRIAL: Replace old stream. Let's see how this performs.
      if (existingCalls.has(call.peer)) {
        console.log("Peer already present, replacing stream");
        cleanUpAvatar(call.peer,existingCalls.get(call.peer));
        existingCalls.delete(call.peer);
      }

      // TODO: Decide if table needs to be swapped.

      // placement: Find free slot, get position
      let ind_slot = allocated_slots.findIndex(element => !element);

      
      //let remotevideo,container;
      let newFrame = new VideoFrame(stream,false,call.peer);
      newFrame.remoteId = call.peer;
      newFrame.slotIndex = ind_slot;
      

      if (ind_slot < 0) {
        logToReceipt("Space on your table is running out, someone will have to keep standing.");
      } else {
        newFrame.container.x = positions[ind_slot].x
        newFrame.container.y = positions[ind_slot].y;


        app.stage.addChild(newFrame.container);

        // mark slot as used
        allocated_slots[ind_slot] = true;
      }


      // insert entry into existingCalls
      existingCalls.set(call.peer,newFrame);

    });


    // Register destructor
    call.on('close', function() {
      cleanUpAvatar(call.peer,existingCalls.get(call.peer));
      existingCalls.delete(call.peer);
    });

    // TODO: Clean these up
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
      var localFrame = new VideoFrame(localStream,true);
      localFrame.videoElement.muted = true;
  
      //sprite to canvas
      localFrame.container.y = app.renderer.height-235;
      localFrame.container.x = 0;


      app.stage.addChild(localFrame.container);



      $("#step1").hide();
    })
    .catch(error => {
        console.error("Error accessing media devices.", error);
        $("#step1-error").show();
      });

  }






  // PeerJS object
  var peer = new Peer({ host: "peer.telekneipe.de", secure:true, path:"/peerjs", debug:2, config: {'iceServers': [
    { urls: 'stun:stun.l.google.com:19302', url: 'stun:stun.l.google.com:19302' } // Pass in optional STUN and TURN server for maximum network compatibility
  ]}});


  // Register Remote Callbacks
  // Output remotely assigned ID  
  peer.on('open', function(){
    $('#my-id').text(peer.id);
    $('#receiptId').text(peer.id);
  });

  // Receive connection request
  peer.on('connection', (conn) => {
  	// TODO: Ask user for connection permission?
  	conn.on('open', () => {
      logToReceipt(`${conn.peer} comes to the table.`)
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
      console.error("Received call before initialization of webcam or our webcam stopped")
    }
    call.answer(localStream);
    if (!connected_peers.includes(call.peer)) {
    		connected_peers.push(call.peer);
    }
    logToReceipt(`${call.peer} sat down at the table`);
    processCall(call);
  });

  peer.on('error', function(err){
    logToReceipt(`An unknown error occured: ${err.message}`)
    console.log(err.message);
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
          if(data) {
      			for (var new_peer in data) {
      				if (!connected_peers.includes(new_peer) && (new_peer != peer.id)) {
      					people_to_call.push(data[new_peer]);
      				}
      			}
          }
          logToReceipt(`They present to you others at the table: ${people_to_call.toString()}`);
          logToReceipt(`Arrived at ${$('#callto-id').val()}'s table.`);
          // for now close the connection, once we've received a list of peers,
          // there is no need to keep the data connection open.
          // This might change, when we introduce more functions
          // Then: Keep track of connection and it might make sense to keep it open.
          connection.close();    			
          // Initiate the calls!
          for (var n in people_to_call) {
            console.log("Calling new peer");
            console.log(people_to_call[n]);
            let call = peer.call(people_to_call[n], localStream);
            call.on("error", function(err) {
              console.log(`An error occured with ${this.peer}: ${err.message}`);
              logToReceipt(`An error occured with ${this.peer}: ${err.message}`);
            })            
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
      showReceipt();
      // display our scene      
      $('#table_container').show();
      // maybe set text so that it's clear what the table's name is?

    });

    $('#catch_events').on("tableservice.call", function() {
      if (!localStream) {
        $("#step1").show()        
        initWebcamStream();
      }
      showReceipt();
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

