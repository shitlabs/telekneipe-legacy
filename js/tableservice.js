import {VideoKitchen} from './avclub.js';
import {createCookie,readCookie,eraseCookie} from './util.js';


const _MIN_VERSION = 0.1;
const _VERSION = 0.1;

export class Tableservice {
  constructor() {
    this.avclub = new VideoKitchen(this.logToReceipt);
    // PeerJS object
    this.peer = new Peer({ host: "peer.telekneipe.de", secure:true, path:"/peerjs", debug:2, config: 
        iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "turn:0.peerjs.com:3478", username: "peerjs", credential: "peerjsp" }
    ]});

    this.trusted_peers = new Set();
    this.banned_peers = new Set();
    this.data_peers = {};
    this.video_peers = {};


    // try to read cookies
    this.skipCookies = readCookie("aC")>= _MIN_VERSION ? createCookie("aC",readCookie("aC"),14) : false;
    this.skipFrequent = readCookie("sF") == "2" ? true : false;
    
    if (readCookie("sF") && this.skipCookies) {
      createCookie("sF",readCookie("sF"),14);
      if (parseInt(readCookie("nV"))) createCookie("nV",parseInt(readCookie("nV")+1,14);
    }

    this.lang = "de"
    if (this.skipCookies && this.readCookie("en")) {
      this.lang = "en";
      createCookie("en","1",14);
    }

    //
    // Register PeerJS Callbacks
    //

    // Connection established, update UI
    this.peer.on('open', () => {
      $('#receiptId').text(this.peer.id);
    });

    // Receive connection request
    this.peer.on('connection', (conn) => {
      // TODO: Ask user for connection permission?
      conn.on('open', () => {        
        this.askConnection(conn,false,() => {
          this.trusted_peers.add(conn.peer)
          this.connected_peers[conn.peer] = conn;
          this.logToReceipt(`${conn.peer} comes to you.`)
          console.log("Sending connected_peers");
          console.log(this.connected_peers);
          conn.send({accept: true, peers: this.connected_peers})
        ;}, 
        () => {
          console.log("Connection rejected");
          this.banned_peers.add(conn.peer);
        });

      conn.on('close', () => {
        this.connected_peers[conn.peer] = undefined;
      }

      conn.on('data', () => {

      })
      });
      
    });

    // Receiving a call
    this.peer.on('call', (call) => {
      // Answer the call automatically (instead of prompting user) for demo purposes
      if (this.avclub.localStream == null) {
        // do some emergency display action
        // TODO
        console.error("Received call before initialization of webcam or our webcam stopped")
      }
      call.answer(this.avclub.localStream);

      this.avclub.processCall(call);

      call.on("stream", () => {        
        if (!this.connected_peers.includes(call.peer)) {
                  this.logToReceipt(`${call.peer} sat down at the table`);                  
                  this.connected_peers.push(call.peer);
        }            
        
      });
      call.on("close", () => {
        let index = this.connected_peers.indexOf(call.peer);
        if (index>=0) { this.connected_peers.splice(index,1); }
      });

    });

    this.peer.on('error', (err) => {
      this.logToReceipt(`An unknown error occured: ${err.message}`)
      console.log(err.message);
      // Clean up our state and UI when error occurs? 
      // Hard to say on which call the error occured though :(
    });


  }

  askConnection(connection,alwaysAsk=false,cbAccept,cbDenied) {
    // pass
  }

  logToReceipt(msg) {
    $("#console").append("div").addClass("msg").text(msg);
    // make the button flash
    $("#receiptButton").fadeOut("fast",function() {$("#receiptButton").fadeIn(); });
  }


  showReceipt() {
    $(".receipt").show();
  }

  offerCookies() {
    createCookie("aC",_VERSION,14);
    createCookie("sF","0",14);
    createCookie("nV","1",14);
    if (window.location.pathname.includes("index_en.html")) {
      table.lang = "en";
      createCookie("en","1",14);
    }
  }

  clubMarke() {
    if (this.skipCookies && readCookie("sF") != "1" && (parseInt(readCookie("nV"))) > 5) {
      let quest_text = this.lang == "en" ? "It seems you're here quite often. Do you want to directly go to the barkeep on your next visits?" : "Scheint so als wärst du einer unserer Stammgäste. Möchtest du bei deinen nächsten Besuchen direkt zur Bar geleitet werden?";
      let quest_choice_yes = $("<span class='fl'>").text(this.lang == "en" ? "Yes, please give me a Telekneipe Clubmarke" : "Ja, bitte gebt mir eine Telekneipe Clubmarke");
      let quest_choice_no = $("<span class='fl'>").text(this.lang == "en" ? "No, I enjoy the experience (we will not ask again)" : "Nein, mir gefällt die Experience (wir fragen nicht noch mal)");
      let quest_choice_next = $("<span class='fl'>").text(this.lang == "en" ? "Maybe next time" : "Vielleicht beim nächsten Mal");
      let quest_callback = function(choice) {if (this.skipCookies) createCookie("sF",choice,14); hideModal(); };

      prepareModal("Clubmarke",quest_text,false);
      let list = $("<ul />");
      list.append($("<li />")).append(quest_choice_yes).click(quest_callback.bind(this,"2"));
      list.append($("<li />")).append(quest_choice_no).click(quest_callback.bind(this,"0"));
      list.append($("<li />")).append(quest_choice_maybe).click(quest_callback.bind(this,"1"));
      $('#modalBody').append(list);
    }
    showModal();    
  }


  prepareCall(callerId) {
    // display our scene
    $('#table_container').show();
    // hide callpad
    $('#call_pad').hide();
    makeCall(callerId);
  }

  handleNewConnection(connection) {
    this.connected_peers[connection.peer] = connection;
    connection.on('close', () => {
      this.connected_peers[connection.peer] = undefined;
    });
  }


  initalizeMeshedConnections(callerId,onConnect) {
    if (this.banned_peers.has(callerId)) return allPeers; // don't add this peer, don't open a connection => return empty list.
    if (this.connected_peers[callerId]) { // peer is already connected.
      if (this.connected_peers[callerId].open) {
        // should we try to get a refreshed list of peers if we have an open connection? For now I would say no.
        if (onConnect) onConnect(callerId);
      }
    }
    // make new peer connection
    let connection = this.peer.connect(callerId);
    connection.on('open', () => {
      connection.on('data',(data) => {
        console.log(`Received connected peers from remote ${callerId}`);
        console.log(data);
        if (data.accept) {
          // should we auto-trust people we call? For now, yes
          this.trusted_peers.add(callerId);
          this.handleNewConnection(connection);
          onConnect(callerId);
        }
        if(data.peers) {
          for (var new_peer of data.peers) {
            if (!this.connected_peers[new_peer] && (new_peer != peer.id)) {
              initalizeMeshedConnections(new_peer,onConnect);
            }
          }
        }
      });
    });
  }

  makeCall(callerId) {
    initalizeMeshedConnections(callerId,(callId) => {
      if (this.trusted_peers.has(callId) && !(this.video_peers.has(callId))) {
        this.logToReceipt(`You approach ${callId} at the table.`);
        console.log(`Calling new peer ${callId}`);
        let call = this.peer.call(callId, this.avclub.localStream);
        call.on("error", (err) => {
          console.log(`An error occured with ${call.peer}: ${err.message}`);
          this.logToReceipt(`An error occured with ${call.peer}: ${err.message}`);
        });                      
        this.avclub.processCall(call);

        call.on("stream", () => {
          if (!this.video_peers.has(call.peer)) {
            this.video_peers.add(call.peer);
          }          
        });
        call.on("close", () => {
          this.video_peers.delete(call.peer);
        });
      }
    });
  }







  
  registerUI() {
    // Register UI events.

    $('#make-call').click(() => {
      this.makeCall($('#callto-id').val());
    });

    // Retry if getUserMedia fails
    $('#hwaccess-retry-button').click(() => {
      $('#hwaccess-retry').hide();
      this.avclub.initWebcamStream();
    });

    // bind events triggered from fabulation
    // these should bubble up to the content-class div #catch_events
    $('#catch_events').on("tableservice.host", () => {
      if (!this.avclub.localStream) {
        $("#hwaccess").show()
        this.avclub.initWebcamStream();
      }
      this.showReceipt();
      // display our scene      
      $('#table_container').show();
      // maybe set text so that it's clear what the table's name is?

    });

    $('#catch_events').on("tableservice.call", () => {
      if (!this.avclub.localStream) {
        $("#hwaccess").show()        
        this.avclub.initWebcamStream();
      }
      this.showReceipt();
      // display the call screen
      $('#call_pad').show();

    });

    $('#catch_events').on("tableservice.hide_call", () => {
      $("#hwaccess").hide()        
      $('#call_pad').hide();

    });

    $('#catch_events').on("tableservice.end", () => {
      this.avclub.closeCalls()
      this.connected_peers = [];
      // hide 
      $('#table_container').hide();      
    });

    $('#catch_events').on("tableservice.receipt", () => {
      this.showReceipt();
    });

    $('#catch_events').on("tableservice.acceptCookies", () => {
      this.offerCookies();
    })


  }



}

