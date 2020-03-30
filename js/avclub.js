import {VideoFrame} from './VideoFrame.js';

const positions = [{x:0, y:0},{x:266, y:0},{x:266*2, y:0},{x:0, y:266},{x:266, y:266},{x:266*2, y:266}];


export class VideoKitchen {
  constructor(logCB) {
  	this.log = logCB;
    // Global defines in tableservice namespace
    this.localStream = null;
    this.existingCalls = new Map();

    this.allocated_slots = new Array(positions.length);
    this.allocated_slots.fill(false);



    // create video element for webcam
    this.webcamvideo = document.createElement("video");
    this.webcamvideo.muted = true;
    this.webcamvideo.preload = true;
    this.webcamvideo.autplay = true;
    this.webcamvideo.playsinline = true;

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
      this._seriously = new Seriously({active:true});
      var source = this._seriously.source(this.webcamvideo);
      var target = this._seriously.target('#canvas');
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

      var reformat = this._seriously.transform('reformat');
      reformat.source = source;
      reformat.width = 128;
      reformat.height = 128;
      reformat.mode = "cover";

      let in_source = reformat;
      // input postprocessing
      Object.keys(effects_out).forEach((key, index) => {
        var effect = this._seriously.effect(key);
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
    this.app = new PIXI.Application({
      width: 800,         // default: 400
      height: 600,        // default: 400
      view: document.getElementById("screen")
    });

    // allow touch
    this.app.renderer.view.style.touchAction = "auto";
    // never not be pixely :)
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

  }


  cleanUpAvatar(call,instance) {
    if (instance != undefined) {
      if (instance.slotIndex>=0) {
        this.allocated_slots[instance.slotIndex] = false;
      }          
    }
  }



  processCall (call) {
    // Wait for stream on the call, then set peer video display
    call.on('stream', (stream) => {
      // BUG as per https://github.com/peers/peerjs/issues/609. Check if call.peer already in existingCalls, if so... ignore?
      // TODO: This might be a bad decision, since we might get a re-call try from our peer, which would be ignored here? Investigate.
      //if (existingCalls.has(call.peer)) return;
      // TRIAL: Replace old stream. Let's see how this performs.
      if (this.existingCalls.has(call.peer)) {
        console.log("Peer already present, replacing stream");
        this.cleanUpAvatar(call.peer,this.existingCalls.get(call.peer));
        this.existingCalls.delete(call.peer);
      }

      // TODO: Decide if table needs to be swapped.

      // placement: Find free slot, get position
      let ind_slot = this.allocated_slots.findIndex(element => !element);

      
      //let remotevideo,container;
      let newFrame = new VideoFrame(stream,false,call.peer);
      newFrame.remoteId = call.peer;
      newFrame.slotIndex = ind_slot;
      

      if (ind_slot < 0) {
        this.log("Space on your table is running out, someone will have to keep standing.");
      } else {
        newFrame.container.x = positions[ind_slot].x
        newFrame.container.y = positions[ind_slot].y;


        this.app.stage.addChild(newFrame.container);

        // mark slot as used
        this.allocated_slots[ind_slot] = true;
      }


      // insert entry into existingCalls
      this.existingCalls.set(call.peer,newFrame);

    });


    // Register destructor
    call.on('close', () => {
      this.cleanUpAvatar(call.peer,this.existingCalls.get(call.peer));
      this.existingCalls.delete(call.peer);
    });    
  }


  initWebcamStream () {
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
      this.webcamvideo.srcObject = stream;
      this.webcamvideo.play(); // TODO: Try without play for chrome's sake

      // TODO: We need WebGl anyways for pixijs, so this is a bit pointless.
      //if (!seriouslyFail && canvas.captureStream) {
        // video effects are supported
        this._seriously.go();
        // mix streams for audio forwarding
        this.localStream = document.getElementById("canvas").captureStream();
        this.localStream.addTrack(stream.getAudioTracks()[0]);
      /*
      } else {
        // they are not, just capture webcam img. as fallback
        localStream = stream;          
      }*/

      // create loopback video element and sprite
      this.localFrame = new VideoFrame(this.localStream,true);
      this.localFrame.videoElement.muted = true;
  
      //sprite to canvas
      this.localFrame.container.y = this.app.renderer.height-235;
      this.localFrame.container.x = 0;


      this.app.stage.addChild(this.localFrame.container);



      $("#step1").hide();
    })
    .catch(error => {
        console.error("Error accessing media devices.", error);
        $("#step1-error").show();
      });

  }

  closeCalls() {
	  // end call
      for (let [key, value] of this.existingCalls) {
        this.cleanUpAvatar(key,value);
        // end call
        key.close();
        // remove element
        this.existingCalls.delete(key);
      }
  }

}