
export  const smallBitFont = new PIXI.TextStyle({
    fontFamily: ["Press Start 2P", "Courier New"],
    fontSize: 11,
    wordWrap: true,
    wordWrapWidth: 2
  });

export  const FrameTexture = PIXI.Texture.from("pics/image_frame.png");
export  const FrameTexture_Filled = PIXI.Texture.from("pics/image_frame_filled.png");
export  const FrameVolIcon = PIXI.Texture.from("pics/volume.png");
export  const FrameMuteIcon = PIXI.Texture.from("pics/volume_mute.png");
export  const VideoIcon = PIXI.Texture.from("pics/video.png");
export  const VideoMuteIcon = PIXI.Texture.from("pics/video_mute.png");





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
    this.muteButton.x = 170;
    this.muteButton.y = 45;
    this.muteButton.on("pointerdown",this.toggleMute.bind(this));


    if (this.selfie) {
      this.videoMuteButton = new PIXI.Sprite(VideoIcon);
      this.videoMuteButton.interactive = true;
      this.videoMuteButton.buttonMode = true;
      this.videoMuteButton.x = 45;
      this.videoMuteButton.y = 45;
      this.videoMuteButton.on("pointerdown",this.videoMute.bind(this));

      this.backsideContainer.addChild(this.videoMuteButton);

    } else {
      if (this.remoteId) {
        let textId = new PIXI.Text(this.remoteId.replace(/-/g, "- "), smallBitFont);
        textId.x = 120;
        textId.y = 120;
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
    this.videoMuteButton.texture = this._stream.getVideoTracks()[0].enabled ? VideoIcon : VideoMuteIcon;
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
