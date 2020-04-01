
export  const smallBitFont = new PIXI.TextStyle({
    fontFamily: ["Press Start 2P", "Courier New"],
    fontSize: 11,
    wordWrap: true,
    wordWrapWidth: 2
  });


// one could discuss the option to make these singletons, but I would hope the resource loader only loads resources once.
export class DefaultFrame {
  constructor(onLoad) {
    let loader = PIXI.Loader.shared;
    this.textures = {};
    loader.add("sprites/basicFrame.json");
    loader.load((loader,resources) => {
      this.textures = resources["sprites/basicFrame.json"].spritesheet.textures;
      this.FrameTexture = this.textures["image_frame.png"];
      this.FrameTexture_filled = this.textures["image_frame_filled.png"];
      this.FrameVolIcon = this.textures["volume.png"];
      this.FrameMuteIcon = this.textures["volume_mute.png"];
      this.VideoIcon = this.textures["video.png"];
      this.VideoMuteIcon = this.textures["video_mute.png"];
      onLoad();
    });

    this.offsetVideo = {x: 27, y: 27};
    this.offsetFrame = {x: 0, y:0}
    this.offsetMute = {x: 170, y:45};
    this.offsetVideoMute = {x:45, y:45};
    this.offsetIdText = {x:120,y:120};

    this.videoTint = 0xe0b888;
  }

  static preLoad() {
    let loader = PIXI.Loader.shared;
    loader.add("sprites/basicFrame.json");
    loader.load();
  }
}

export class VideoFrame {
  constructor(stream,selfie = false,peerId=null) {
    this.remoteId = peerId;
    this.slotIndex = null;

    this.selfie = selfie;

    this._stream = stream;

    //webcam to sprite
    this.videoElement = document.createElement("video");         
    this.videoElement.autoplay = true;
    this.videoElement.playsinline = true;
    this.videoElement.srcObject = this._stream;
    this.videoElement.play();
   
    this.container = new PIXI.Container()

    this._frames = new DefaultFrame(() => {

      this.frame = new PIXI.Sprite(this._frames.FrameTexture);
      this.frame.x = this._frames.offsetFrame.x;
      this.frame.y = this._frames.offsetFrame.y;
      this.frame.zIndex = 10;


      


      this.backsideContainer = new PIXI.Container();

      this.overlaySprite = new PIXI.Sprite(this._frames.FrameTexture_Filled);
      this.overlaySprite.x = this._frames.offsetFrame.x;
      this.overlaySprite.y = this._frames.offsetFrame.y;

      this.backsideContainer.addChild(this.overlaySprite);

      this.muteButton = new PIXI.Sprite(this._frames.FrameVolIcon);
      this.muteButton.interactive = true;
      this.muteButton.buttonMode = true;
      this.muteButton.x = this._frames.offsetMute.x;
      this.muteButton.y = this._frames.offsetMute.y;
      this.muteButton.on("pointerdown",this.toggleMute.bind(this));


      if (this.selfie) {
        this.videoMuteButton = new PIXI.Sprite(this._frames.VideoIcon);
        this.videoMuteButton.interactive = true;
        this.videoMuteButton.buttonMode = true;
        this.videoMuteButton.x = this._frames.offsetVideoMute.x;
        this.videoMuteButton.y = this._frames.offsetVideoMute.y;
        this.videoMuteButton.on("pointerdown",this.videoMute.bind(this));

        this.backsideContainer.addChild(this.videoMuteButton);

      } else {
        if (this.remoteId) {
          this.textId = new PIXI.Text(this.remoteId.replace(/-/g, "- "), smallBitFont);
          this.textId.x = this._frames.offsetIdText.x;
          this.textId.y = this._frames.offsetIdText.y;
          this.backsideContainer.addChild(this.textId);
        }
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


    });

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
    this.muteButton.texture = state ? this._frames.FrameMuteIcon : this._frames.FrameVolIcon;
  }

  videoMute() {
    this._stream.getVideoTracks()[0].enabled = !this._stream.getVideoTracks()[0].enabled;
    this.videoMuteButton.texture = this._stream.getVideoTracks()[0].enabled ? this._frames.VideoIcon : this._frames.VideoMuteIcon;
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

  setTable(tableInstane) {
    this._frames = tableInstance;
    // TODO: Update all sprites.
  }
}
