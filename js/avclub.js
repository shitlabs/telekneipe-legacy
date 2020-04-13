import {VideoFrame,AudioFrame,DefaultFrame} from './VideoFrame.js';



export function preLoadSprites() {
  DefaultFrame.preload();
  let table = new BaseTable("sprites/basic.json",()=>{});
}

export class BaseTable {
  constructor(spriteSheet,onLoad) {
    let loader = PIXI.Loader.shared;
    this.textures = {}
    this.resources = {}
    this.protectArea = {};
    this.giveUpHeight = true;
    this.giveUpWidth = true;
    if (loader.resources[spriteSheet]) {
      onLoad()
    } else {
      loader.add(spriteSheet);
      loader.load((loader,resources) => {      
        this.textures = resources[spriteSheet].spritesheet.textures;
        this.animations  = resources[spriteSheet].spritesheet.animations;
        onLoad();
      });    
    }
  }
}

// one could discuss the option to make these singletons, but I would hope the resource loader only loads resources once.
export class DefaultTable extends BaseTable {
  constructor(onLoad) {
    super("sprites/basicTable.json",onLoad);
    this.protectArea = {top: 100, left: 100, bottom: 150, right: 250};
    this.giveUpHeight = true;
    this.giveUpWidth = false;
  }
  getBackgroundSprite() {
    let background = new PIXI.AnimatedSprite(this.animations["frame"]);
    // overrite currentFrame to return a random frame
    background.updateTexture = function()
    {
        this._texture = this._textures[Math.floor(Math.random()* this._textures.length)];
        this._textureID = -1;
        this._textureTrimmedID = -1;
        this._cachedTint = 0xFFFFFF;
        this.uvs = this._texture._uvs.uvsFloat32;
        if (this.updateAnchor)
        {
            this._anchor.copyFrom(this._texture.defaultAnchor);
        }
        if (this.onFrameChange)
        {
            this.onFrameChange(this.currentFrame);
        }
    }.bind(background);

    return background;
  }
}

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


    // create canvas to draw webcam to
    this.webcamcanvas = document.createElement("canvas");
    this.webcamcanvas.style.width = "128px";
    this.webcamcanvas.style.height = "128px";

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
      var target = this._seriously.target(this.webcamcanvas);
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

    
    let width = window.innerWidth;
    let height = window.innerHeight-8;
    //create a Pixi Application
    this.app = new PIXI.Application({
      width: width,         // default: 400
      height: height,        // default: 400
      view: document.getElementById("screen")
    });

    // allow touch
    this.app.renderer.view.style.touchAction = "auto";
    this.app.renderer.view.style.margin = "auto";
    this.app.renderer.view.style.display = "block";
    // on rescale
    window.addEventListener('resize', this.rescale.bind(this));

    // never not be pixely :)
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

    this.table = new DefaultTable(() => {
        this.backgroundSprite = this.table.getBackgroundSprite();
        let size = VideoKitchen.calcGeometry();
        this.backgroundSprite.width = size.x;
        this.backgroundSprite.height = size.y;
        this.backgroundSprite.x = size.width-size.x;
        this.backgroundSprite.y = size.height-size.y;
        this.backgroundSprite.animationSpeed = 0.1;
        this.app.stage.addChild(this.backgroundSprite);
        this.backgroundSprite.play();
    });



  }


  cleanUpAvatar(call,instance) {
    if (instance != undefined) {
      this.app.stage.removeChild(instance.container);
      instance.unload();
    }
  }


  rescale() {
    let size = VideoKitchen.calcGeometry();
    if (this.app) {
      this.app.renderer.resize(size.width, size.height);

      this.backgroundSprite.width = size.x;
      this.backgroundSprite.height = size.y;
      this.backgroundSprite.x = (size.width-size.x)/2;
      this.backgroundSprite.y = (size.height-size.y)/2;
      let frame_width = 235;
      let frame_height = 235;
      if (this.localStream) {
          if (((size.width< 2*frame_width) || (size.height< 2*frame_height)) && (this.existingCalls.size > 1)) {
              // need to switch to minimal mode 
          }

          if (this.existingCalls.size <4) {
              this.placeElementsDynamically(frame_width,frame_height,size);
          } else {
              this.placeElementsOnGrid(frame_width,frame_height,size);
          }
      }
    }
  }

  placeElementsOnGrid(frame_width,frame_height,size) {
    let rows = ~~(size.height/frame_height);
    let cols = ~~(size.width/frame_width);
    let ypad = (size.height % frame_height)/cols;
    let xpad = (size.width % frame_width)/rows;

    let n_row = 0;
    let n_col = 0;
    for (const element of this.existingCalls.values()) {
      element.container.scale.x = 1;
      element.container.scale.y = 1;
      if (n_col>=cols) {
        n_col = 0;
        n_row++;
      }
      //file x from right and y from top
      element.container.x = size.width-(n_col+1)*frame_width-n_col*xpad;
      element.container.y = n_row*frame_height+n_row*ypad;
      n_col++;
    }

    this.localFrame.container.x=0;
    this.localFrame.container.y=size.height-frame_height;
    this.localFrame.container.scale.x = 1;
    this.localFrame.container.scale.y = 1;

  }

  placeElementsDynamically(frame_width,frame_height,size) {
    // find out how many rows and cols we can have.
    let rows = ~~(size.height/frame_height);
    let cols = ~~(size.width/frame_width);

    let framescale = 1;
    // check if we should scale up frames, max remotes 2        
    if ((rows >= (this.existingCalls.size+1)*2) && (cols >= (this.existingCalls.size+1)*2)) {
            // yes, scale twice
            framescale = 2;
    } else if ((rows >= (this.existingCalls.size+1)*1.5) && (cols >= (this.existingCalls.size+1)*1.5)) {
            // yes, scale 1.5
            framescale = 1.5;
    }
    frame_height *= framescale;
    frame_width *= framescale;

    rows = ~~(size.height/frame_height);
    cols = ~~(size.width/frame_width);

    // stick to default (or switch?)
    // try to place loopback at lower left corner of table
    this.localFrame.container.y = (this.backgroundSprite.y + this.table.protectArea.bottom*this.backgroundSprite.scale.y+frame_height <= size.height) ? 
        this.backgroundSprite.y + this.table.protectArea.bottom*this.backgroundSprite.scale.y : size.height-frame_height;
    this.localFrame.container.x = (this.backgroundSprite.x + this.table.protectArea.left*this.backgroundSprite.scale.x-frame_width <= 0) ? 
        0 : this.backgroundSprite.x + this.table.protectArea.left*this.backgroundSprite.scale.x-frame_width;
    
    this.localFrame.container.scale.x = framescale;
    this.localFrame.container.scale.y = framescale;
    if (this.existingCalls.size > 0) {
      let elements = this.existingCalls.values();
      // now we need to figure out how many need to be placed.
      let element = elements.next().value.container;
      if (this.existingCalls.size == 1) {
          // same as local but top right.
          element.y = (this.backgroundSprite.y + this.table.protectArea.top*this.backgroundSprite.scale.y - frame_height <= 0) ? 
              0 : this.backgroundSprite.y + this.table.protectArea.top*this.backgroundSprite.scale.y-frame_height;
          element.x = (this.backgroundSprite.x + this.table.protectArea.right*this.backgroundSprite.scale.x+frame_width <= size.width) ? 
              this.backgroundSprite.x + this.table.protectArea.right*this.backgroundSprite.scale.x : size.width-frame_width;

          element.scale.x = framescale;
          element.scale.y = framescale;
      }  
      else if (this.existingCalls.size >= 2) {
        let min_padding = 30;
        let y = (this.backgroundSprite.y + this.table.protectArea.top*this.backgroundSprite.scale.y-frame_height <= 0) ? 
            0 : this.backgroundSprite.y + this.table.protectArea.top*this.backgroundSprite.scale.y-frame_height;
        //let element = elements.next().value.container;
        let x = 0;
        if (cols >3) {             
            // we can place two in top row with padding.            
            if ((frame_width*2+min_padding)+this.backgroundSprite.x+this.table.protectArea.right*this.backgroundSprite.scale.x <= size.width) {
              // place both right of reserved zone
              x = this.backgroundSprite.x + this.table.protectArea.right*this.backgroundSprite.scale.x;
            } else {
              // place on right border (keep order).
              x = size.width - (2*frame_width+min_padding);
            }
            element.x = x;
            element.y = y;
            element.scale.x = framescale;
            element.scale.y = framescale;               
            element = elements.next().value.container;
            element.x = x+frame_width+min_padding;
            element.y = y;
            element.scale.x = framescale;
            element.scale.y = framescale;
        } else {                
            element.x = 0;
            element.y = y;
            element.scale.x = framescale;
            element.scale.y = framescale;
            element = elements.next().value.container;
            element.x = size.width-frame_width;
            element.y = y;
            element.scale.x = framescale;
            element.scale.y = framescale;
        }

        element = elements.next().value;
        if (element) {
          element=element.container;
          element.y = (this.backgroundSprite.y + this.table.protectArea.bottom*this.backgroundSprite.scale.y+frame_height <= size.height) ? 
              this.backgroundSprite.y + this.table.protectArea.bottom*this.backgroundSprite.scale.y : size.height-frame_height;
          element.x = (this.backgroundSprite.x + this.table.protectArea.right*this.backgroundSprite.scale.x+frame_width <= size.width) ? 
              this.backgroundSprite.x + this.table.protectArea.right*this.backgroundSprite.scale.x : size.width-frame_width;
          element.scale.x = framescale;
          element.scale.y = framescale;
        }
      }
    }
  }

  processCall (call) {
    // Wait for stream on the call, then set peer video display
    call.on('stream', (stream) => {
      console.log("New Stream received:");
      console.log(stream);
      // BUG as per https://github.com/peers/peerjs/issues/609. Check if call.peer already in existingCalls, if so... ignore?
      // TODO: This might be a bad decision, since we might get a re-call try from our peer, which would be ignored here? Investigate.
      //if (existingCalls.has(call.peer)) return;
      // TRIAL: Replace old stream. Let's see how this performs.
      if (this.existingCalls.has(call.peer)) {
        console.log("Peer already present, replacing stream");
        this.cleanUpAvatar(call.peer,this.existingCalls.get(call.peer));
        this.existingCalls.delete(call.peer);
      }


      // check if stream contains video or audio only, then get new Instance for it.
      let newFrame = (stream.getVideoTracks().length > 0) ? new VideoFrame(stream,false,call.peer) : new AudioFrame(stream,false,call.peer);
      newFrame.remoteId = call.peer;

      

      newFrame.container.x = 0;
      newFrame.container.y = 0;


      this.app.stage.addChild(newFrame.container);
      


      // insert entry into existingCalls
      this.existingCalls.set(call.peer,newFrame);

      // update placement
      this.rescale();
    });


    // Register destructor
    call.on('close', () => {
      this.cleanUpAvatar(call.peer,this.existingCalls.get(call.peer));
      this.existingCalls.delete(call.peer);
      this.rescale();
    });    
  }


  initWebcamStream () {
    // Get audio/video stream
    const constraintsVideo = {
      video: {
        facingMode: 'user',
        aspectRatio: { ideal: 1 },
        height: { ideal: 360},
        //frameRate: { ideal: 15},
      },
      audio: {
        echoCancellation: true
      }
      };

    if (this.debugForceAudio) {      
      return this.initMicOnlyStream();
    }

    return new Promise((resolve,reject) => {



      if (!this.localStream) {
        navigator.mediaDevices.getUserMedia(constraintsVideo)
        .then(stream => {
          this._hasVideo = true;
          this.webcamvideo.srcObject = stream;
          this.webcamvideo.play(); // TODO: Try without play for chrome's sake

          // TODO: We need WebGl anyways for pixijs, so this is a bit pointless.
          //if (!seriouslyFail && canvas.captureStream) {
            // video effects are supported
            this._seriously.go();
            // mix streams for audio forwarding
            this.localStream = this.webcamcanvas.captureStream();
            for (var track of stream.getAudioTracks()) {
              this.localStream.addTrack(track);
            }
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
          this.rescale()


          $("#hwaccess").hide();
          resolve(this.localStream);
        })
        .catch(error => {
          if (error.name == "NotFoundError" || error.name == "OverconstrainedError") {
            console.log("Could not get default device configuration, trying to get audio only");
            this.initMicOnlyStream().then(stream => {resolve(stream);}).catch(error => {reject(error)});
          } else if (error.name == "NotAllowedError") {
            console.log("Access not allowed. Ask user again");
            $("#hwaccess-retry").show();
            // Retry if getUserMedia fails
            $('#hwaccess-retry-button').click(() => {
              $('#hwaccess-retry').hide();
              this.avclub.initWebcamStream().then((stream) => {resolve(stream)}).catch((error) => {reject(error)});
            });            
          } else {
            console.error("Unknown error accessing media devices.", error);
            $("#hwaccess-error").show();
            reject(error)
          }
          });
      }
    });
  }

  initMicOnlyStream() {
    const constraintsAudio = {
      audio: {
        echoCancellation: true
      },
      video: false
    };
    return new Promise((resolve,reject) => {
      if (!this.localStream) {
        navigator.mediaDevices.getUserMedia(constraintsAudio)
        .then(stream => {
          this._hasVideo = false;

          // TODO: Either find a way to communicate audioOnly to remote, or add option to upload an avatar here.

          // we need to send a video to get a video, unless we start implementing transceivers, which seems difficult with the current state of peerjs.
          let black = ({width = 320, height = 320} = {}) => {
            this.audiocanvas = Object.assign(document.createElement("canvas"), {width, height});
            this.audiocanvas.getContext('2d').fillRect(0, 0, width, height);
            return this.audiocanvas.captureStream();
          }                   

          this.localStream = black();
          for (var track of stream.getAudioTracks()) {
            this.localStream.addTrack(track);
          }        

          // create audio sprite
          this.localFrame = new AudioFrame(this.localStream,true);
      
          //sprite to canvas
          this.localFrame.container.y = this.app.renderer.height-235;
          this.localFrame.container.x = 0;


          this.app.stage.addChild(this.localFrame.container);
          this.rescale()


          $("#hwaccess").hide();
          resolve(this.localStream);
        })
        .catch(error => {
          if (error.name == "NotAllowedError") {
            console.log("Access not allowed. Ask user again");
            $("#hwaccess-retry").show();
            // Retry if getUserMedia fails
            $('#hwaccess-retry-button').click(() => {
              $('#hwaccess-retry').hide();
              this.avclub.initMicOnlyStream().then((stream) => {resolve(stream)}).catch((error) => {reject(error)});
            });
          } else {
            console.error("Unknown error accessing media devices.", error);
            $("#hwaccess-error").show();
            reject(error);
          }
          });
      }
    });
  }

  closeCalls() {
      // end call
      for (let [key, value] of this.existingCalls) {
        this.cleanUpAvatar(key,value);
        // end call
        this.parent.closeCall(key);
        // remove element
        this.existingCalls.delete(key);
      }
      this.rescale();
  }

  debugAddFrame(id) {      
    //let remotevideo,container;
    let newFrame = new VideoFrame(null,false,id);
    newFrame.remoteId = id;

    

    newFrame.container.x = 0;
    newFrame.container.y = 0;


    this.app.stage.addChild(newFrame.container);
    


    // insert entry into existingCalls
    this.existingCalls.set(id,newFrame);

    // update placement
    this.rescale();
  }

  static calcGeometry() {
    let width = window.innerWidth;
    let height = window.innerHeight-8;

    let s_width = width;
    let s_height = height;
    if (width/height>=16/9) {
        s_width = height*16/9;
    } else {
        s_height = width*9/16;
    }
    return {x: s_width, y:s_height,width: width, height: height };
  }

}