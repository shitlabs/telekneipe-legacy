
export  const smallBitFont = new PIXI.TextStyle({
    fontFamily: ["Press Start 2P", "Courier New"],
    fontSize: 11,
    wordWrap: true,
    wordWrapWidth: 2
  });

export class MinimalFrame {
  constructor() {
    this.FrameTexture = undefined;
    this.FrameTexture_filled = undefined;
    this.FrameVolIcon = undefined;
    this.FrameMuteIcon = undefined;
    this.VideoIcon = undefined;
    this.VideoMuteIcon = undefined;

    this.offsetVideo = {x: 0, y: 0};
    this.offsetFrame = {x: 0, y:0}
    this.offsetMute = {x: 170, y:45};
    this.offsetVideoMute = {x:45, y:45};
    this.offsetIdText = {x:120,y:120};

    this.videoTint = 0xe0b888;


  }


}


// one could discuss the option to make these singletons, but I would hope the resource loader only loads resources once.
export class DefaultFrame extends MinimalFrame {
  constructor() {
    if (!DefaultFrame.instance) {
      super();
      this._spriteSheet = "sprites/basicFrame.json";
      this.loaded = false;
      this.offsetVideo = {x: 27, y: 27};
      this.offsetFrame = {x: 0, y:0}
      this.offsetMute = {x: 170, y:45};
      this.offsetVideoMute = {x:45, y:45};
      this.offsetIdText = {x:120,y:120};

      this.videoTint = 0xe0b888;

      this.textures = new Promise((resolve,reject)=>{this.loadTextures(resolve,reject)});

      DefaultFrame.instance = this;

    }    
    return DefaultFrame.instance;
  }

  loadTextures(resolve,reject) {    
    let loader = PIXI.Loader.shared;

    if (loader.resources[this._spriteSheet]) {
      //FIXME: Bad code duplication.
      let textures = loader.resources[this._spriteSheet].spritesheet.textures
      this.FrameTexture = textures["image_frame.png"];
      this.FrameTexture_filled = textures["image_frame_filled.png"];
      this.FrameVolIcon = textures["volume.png"];
      this.FrameMuteIcon = textures["volume_mute.png"];
      this.VideoIcon = textures["video.png"];
      this.VideoMuteIcon = textures["video_mute.png"];
      resolve(textures);
    } else {
      loader.add(this._spriteSheet);
      loader.load((loader,resources) => {
        let textures = resources[this._spriteSheet].spritesheet.textures;
        this.FrameTexture = textures["image_frame.png"];
        this.FrameTexture_filled = textures["image_frame_filled.png"];
        this.FrameVolIcon = textures["volume.png"];
        this.FrameMuteIcon = textures["volume_mute.png"];
        this.VideoIcon = textures["video.png"];
        this.VideoMuteIcon = textures["video_mute.png"];
        resolve(textures);
      });
    }
  }


}


// FIXME: Implement singleton and promise based loader for this class
export class DefaultAudioFrame extends MinimalFrame {
  constructor() {
    if (!DefaultAudioFrame.instance) {
      super();
      this._spriteSheet = "sprites/audioFrame.json";
      this.loaded = false;
      this.offsetVideo = {x: 10, y: 10};
      this.offsetFrame = {x: 0, y:0}
      this.offsetMute = {x: 66, y:45};
      this.offsetVideoMute = {x:0, y:0};
      this.offsetIdText = {x:20,y:80};

      this.videoTint = 0xffffff;

      this.textures = new Promise((resolve,reject)=>{this.loadTextures(resolve,reject)});

      DefaultAudioFrame.instance = this;
    }

    return DefaultAudioFrame.instance;
  }

  loadTextures(resole,reject) {
    let loader = PIXI.Loader.shared;

    if (loader.resources[this._spriteSheet]) {
      //FIXME: Bad code duplication.
      let textures = loader.resources["sprites/audioFrame.json"].spritesheet.textures;
      this.SpeakerTexture = textures["speaker_inner.png"]
      this.FrameTexture = textures["speaker_frame.png"];
      this.FrameTexture_filled = textures["speaker_frame_filled.png"];
      this.FrameVolIcon = textures["volume.png"];
      this.FrameMuteIcon = textures["volume_mute.png"];
      this.VideoIcon = textures["video.png"];
      this.VideoMuteIcon = textures["video_mute.png"];
      resolve(textures);
    } else {
      loader.add(this._spriteSheet);
      loader.load((loader,resources) => {
        let textures = loader.resources["sprites/audioFrame.json"].spritesheet.textures;
        this.SpeakerTexture = textures["speaker_inner.png"]
        this.FrameTexture = textures["speaker_frame.png"];
        this.FrameTexture_filled = textures["speaker_frame_filled.png"];
        this.FrameVolIcon = textures["volume.png"];
        this.FrameMuteIcon = textures["volume_mute.png"];
        this.VideoIcon = textures["video.png"];
        this.VideoMuteIcon = textures["video_mute.png"];
        resolve(textures);
      });
    }
  }
}


let FrameInterface = {
  init(stream,selfie = false,peerId=null,onLoadCB=null) {
    this.remoteId = peerId;
    this.slotIndex = null; //deprecated

    this.selfie = selfie;

    this._stream = stream;

    this.container = new PIXI.Container();

    this._frames.textures.then(() => {

      this.frame = new PIXI.Sprite(this._frames.FrameTexture);
      this.frame.x = this._frames.offsetFrame.x;
      this.frame.y = this._frames.offsetFrame.y;
      this.frame.zIndex = 10;


      


      this.backsideContainer = new PIXI.Container();

      this.overlaySprite = new PIXI.Sprite(this._frames.FrameTexture_filled);
      this.overlaySprite.x = this._frames.offsetFrame.x;
      this.overlaySprite.y = this._frames.offsetFrame.y;

      this.backsideContainer.addChild(this.overlaySprite);

      this.muteButton = new PIXI.Sprite(this._frames.FrameVolIcon);
      this.muteButton.interactive = true;
      this.muteButton.buttonMode = true;
      this.muteButton.x = this._frames.offsetMute.x;
      this.muteButton.y = this._frames.offsetMute.y;
      this.muteButton.on("pointerdown",this.toggleMute.bind(this));

      if (this.remoteId) {
          this.textId = new PIXI.Text(this.remoteId.replace(/-/g, "- "), smallBitFont);
          this.textId.x = this._frames.offsetIdText.x;
          this.textId.y = this._frames.offsetIdText.y;
          this.backsideContainer.addChild(this.textId);
      }


      this.backsideContainer.addChild(this.muteButton); // add late to keep in front.


      this.backsideContainer.visible = false;
      this.backsideContainer.zIndex = 30;

      this.container.addChild(this.frame);

      this.container.addChild(this.backsideContainer);


      this.container.sortChildren();


      // event registration
      this.container.interactive = true;
      this.container.on('pointerover', this._showBack.bind(this))
        .on('pointerout', this._hideBack.bind(this));

      // chain onLoad function from childs
      if(onLoadCB) onLoadCB();
    }).catch(console.log.bind(console));


    this._internalVolume = 100;
  },

  _showBack() {
    this.backsideContainer.visible = true;
  },

  _hideBack() {
    this.backsideContainer.visible = false;
  },

  toggleMute() {
    let state = false;
    if (this.selfie) {
      this._stream.getAudioTracks()[0].enabled = !this._stream.getAudioTracks()[0].enabled;
      state = !this._stream.getAudioTracks()[0].enabled;
    } else if (this.videoElement) {
      state = this.videoElement.muted
      this.videoElement.muted = !state;
      state = !state;
    }
    this.muteButton.texture = state ? this._frames.FrameMuteIcon : this._frames.FrameVolIcon;
  },

  videoMute() {
    if (this._stream.getVideoTracks().length > 0) {
      this._stream.getVideoTracks()[0].enabled = !this._stream.getVideoTracks()[0].enabled;
      this.videoMuteButton.texture = this._stream.getVideoTracks()[0].enabled ? this._frames.VideoIcon : this._frames.VideoMuteIcon;
    }
  },

  set volume(val) {
    this.videoElement.volume = val;
  },

  get volume() {
    if (this.videoElement) return (this.videoElement.volume);
    return 0;
  },

  duck(vol=10) {
    this._internalVolume = this.volume;
    this.volume = vol;
  },

  unduck() {
    this.volume = this._internalVolume;
  },

  unload() {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.muted = true;
      this.videoElement.removeAttribute('srcObject');    
    }
  },

}


export class AudioFrame {
  constructor(stream, selfie = false, peerId=null) {
    this._frames = new DefaultAudioFrame();

    // stream to sprite
    if (!selfie) {
      this.videoElement = document.createElement("audio");
      this.videoElement.autoplay = true;
      this.videoElement.srcObject = stream;
      this.videoElement.play();
    }

    this.init(stream,selfie,peerId, () => {

      this.videoSprite = PIXI.Sprite.from(this._frames.SpeakerTexture);
      this.videoSprite.x =  this._frames.offsetVideo.x;
      this.videoSprite.y = this._frames.offsetVideo.y;
      this.videoSprite.zIndex = 20;

      this.container.addChild(this.videoSprite);
      this.container.sortChildren();

    });

    this._internalVolume = 100;
  }

}

Object.assign(AudioFrame.prototype, FrameInterface);


export class VideoFrame {
  constructor(stream,selfie = false,peerId=null) {
    this._frames = new DefaultFrame();

    //webcam to sprite
    this.videoElement = document.createElement("video");         
    this.videoElement.autoplay = true;
    this.videoElement.playsinline = true;
    this.videoElement.srcObject = stream;
    this.videoElement.play();

    this.init(stream,selfie,peerId, () => {   
      if (this.selfie) {
        this.videoMuteButton = new PIXI.Sprite(this._frames.VideoIcon);
        this.videoMuteButton.interactive = true;
        this.videoMuteButton.buttonMode = true;
        this.videoMuteButton.x = this._frames.offsetVideoMute.x;
        this.videoMuteButton.y = this._frames.offsetVideoMute.y;
        this.videoMuteButton.on("pointerdown",this.videoMute.bind(this));

        this.backsideContainer.addChild(this.videoMuteButton);
      }

      //let texture = PIXI.Texture.from();
      this.videoSprite = PIXI.Sprite.from(this.videoElement);
      this.videoSprite.width = 182;
      this.videoSprite.height = 182;
      this.videoSprite.x =  this._frames.offsetVideo.x;
      this.videoSprite.y = this._frames.offsetVideo.y;
      this.videoSprite.zIndex = 20;

      if (this.selfie) this.videoSprite.texture.rotate = 12;
      if (this._frames.videoTint) this.videoSprite.tint = this._frames.videoTint;    

      this.container.addChild(this.videoSprite);
      this.container.sortChildren();

    });


    this._internalVolume = 100;
  }

/*  setFrame(frameClass) {
    // TODO
  }*/
}

Object.assign(VideoFrame.prototype, FrameInterface);