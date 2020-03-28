import VideoKitchen from './avclub.js';

class Tableservice {
  constructor() {
    this.avclub = new VideoKitchen(this.logToReceipt);
    // PeerJS object
    this.peer = new Peer({ host: "peer.telekneipe.de", secure:true, path:"/peerjs", debug:2, config: {'iceServers': [
      { urls: 'stun:stun.l.google.com:19302', url: 'stun:stun.l.google.com:19302' } // Pass in optional STUN and TURN server for maximum network compatibility
    ]}});

    this.known_peers = [];
    this.connected_peers = [];


    //
    // Register PeerJS Callbacks
    //

    // Connection established, update UI
    this.peer.on('open', () => {
      $('#receiptId').text(peer.id);
    });

    // Receive connection request
    this.peer.on('connection', (conn) => {
      // TODO: Ask user for connection permission?
      conn.on('open', () => {
        this.logToReceipt(`${conn.peer} comes to the table.`)
        console.log("Sending connected_peers");
        console.log(connected_peers);
        conn.send(connected_peers);
      });
      
    });

    // Receiving a call
    this.peer.on('call', (call) => {
      // Answer the call automatically (instead of prompting user) for demo purposes
      if (this.localStream == null) {
        // do some emergency display action
        // TODO
        console.error("Received call before initialization of webcam or our webcam stopped")
      }
      call.answer(this.localStream);

      this.avclub.processCall(call);

      call.on("stream", () => {        
        if (!this.connected_peers.includes(call.peer)) {
                  this.logToReceipt(`${call.peer} sat down at the table`);                  
                  this.connected_peers.push(call.peer);
        }            
        
      });
      call.on("close", () => {
        let index = this.connected_peers.findIndex((element) => (element == call.peer));
        if (index>0) this.connected_peers.slice(index,1);
      });

    });

    this.peer.on('error', (err) => {
      this.logToReceipt(`An unknown error occured: ${err.message}`)
      console.log(err.message);
      // Clean up our state and UI when error occurs? 
      // Hard to say on which call the error occured though :(
    });


  }


  logToReceipt(msg) {
    $("#console").prepend(`<div class="msg">${msg}</div>`);
    // make the button flash
    $("#receiptButton").fadeOut("fast",function() {$("#receiptButton").fadeIn(); });
  }


  showReceipt() {
    $(".receipt").show();
  }


  makeCall(callerId) {
    // display our scene
    $('#table_container').show();
    // hide callpad
    $('#call_pad').hide();
    // Open a data connection     
    let connection = this.peer.connect(callerId);
    connection.on('open',() => {
      connection.on('data',(data) => {
        let people_to_call = [callerId];
        console.log("Received connected peers from remote");
        console.log(data);
        if(data) {
          for (var new_peer in data) {
            if (!this.connected_peers.includes(new_peer) && (new_peer != peer.id)) {
              people_to_call.push(data[new_peer]);
            }
          }
        }
        this.logToReceipt(`They present to you others at the table: ${people_to_call.toString()}`);
        this.logToReceipt(`Arrived at ${callerId}'s table.`);
        // for now close the connection, once we've received a list of peers,
        // there is no need to keep the data connection open.
        // This might change, when we introduce more functions
        // Then: Keep track of connection and it might make sense to keep it open.
        connection.close();         
        // Initiate the calls!
        for (var n in people_to_call) {
          console.log("Calling new peer");
          console.log(people_to_call[n]);
          let call = this.peer.call(people_to_call[n], this.avclub.localStream);
          call.on("error", (err) => {
            console.log(`An error occured with ${call.peer}: ${err.message}`);
            this.logToReceipt(`An error occured with ${call.peer}: ${err.message}`);
          });                      
          this.avclub.processCall(call);

          call.on("stream", () => {
            if (!this.connected_peers.includes(call.peer)) {
                      this.connected_peers.push(call.peer);
            }            
            
          });
          call.on("close", () => {
            let index = this.connected_peers.findIndex((element) => (element == call.peer));
            if (index>0) this.connected_peers.slice(index,1);
          });
        }

      });         
    });
  }






  
  registerUI() {
    // Register UI events.

    $('#make-call').click(() => {
      this.makeCall($('#callto-id').val());
    });

    // Retry if getUserMedia fails
    $('#step1-retry').click(() => {
      $('#step1-error').hide();
      this.avclub.initWebcamStream();
    });

    // bind events triggered from fabulation
    // these should bubble up to the content-class div #catch_events
    $('#catch_events').on("tableservice.host", () => {
      if (!this.avclub.localStream) {
        $("#step1").show()
        this.avclub.initWebcamStream();
      }
      this.showReceipt();
      // display our scene      
      $('#table_container').show();
      // maybe set text so that it's clear what the table's name is?

    });

    $('#catch_events').on("tableservice.call", () => {
      if (!this.avclub.localStream) {
        $("#step1").show()        
        this.avclub.initWebcamStream();
      }
      this.showReceipt();
      // display the call screen
      $('#call_pad').show();

    });

    $('#catch_events').on("tableservice.hide_call", () => {
      $("#step1").hide()        
      $('#call_pad').hide();

    });

    $('#catch_events').on("tableservice.end", () => {
      this.avclub.closeCalls()
      this.connected_peers = [];
      // hide 
      $('#table_container').hide();      
    });




  }



}

