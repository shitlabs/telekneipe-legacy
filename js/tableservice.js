import {VideoKitchen} from './avclub.js';



export class Tableservice {
  constructor(parent) {
    this.parent = parent;
    this.logToReceipt = this.parent.logToReceipt;
    this.avclub = new VideoKitchen(this.logToReceipt);
    // PeerJS object
    this.peer = new Peer({ host: "peer.telekneipe.de", secure:true, path:"/peerjs", debug:2, config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "turn:0.peerjs.com:3478", username: "peerjs", credential: "peerjsp" }
          ]
        }
    });

    this.trusted_peers = new Set();
    this.banned_peers = new Set();
    this.data_peers = {};
    this.video_peers = new Set();



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
        this.parent.askConnection(conn,false,() => {
          this.trusted_peers.add(conn.peer)
          this.data_peers[conn.peer] = conn;
          this.logToReceipt(`${conn.peer} comes to you.`)
          console.log("Sending video_peers");
          console.log([...this.video_peers]);
          conn.send({accept: true, peers: [...this.video_peers]});
          this.handleData(connection);
        }, 
        () => {
          console.log("Connection rejected");
          this.banned_peers.add(conn.peer);
        });
      });
      conn.on('close', () => {
        this.data_peers[conn.peer] = undefined;
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
        if (!this.video_peers.has(call.peer)) {
                  this.logToReceipt(`${call.peer} sat down at the table`);                  
                  this.video_peers.add(call.peer);
        }            
        
      });
      call.on("close", () => {
        this.video_peers.delete(call.peer); 
      });

    });

    this.peer.on('error', (err) => {
      this.logToReceipt(`An unknown error occured: ${err.message}`)
      console.log(err.message);
      // Clean up our state and UI when error occurs? 
      // Hard to say on which call the error occured though :(
    });


  }


  handleData(connection) {
    connection.on('data', (data) => {
      // pass
    })
  }
 
  handleNewConnection(connection) {
    this.data_peers[connection.peer] = connection;
    connection.on('close', () => {
      this.data_peers[connection.peer] = undefined;
    });
    connection.on('data', () => {
      this.handleData(connection);
    });
  }


  closeConnections() {
    for (peerId in this.data_peers) {
      this.data_peers[peerId].close();
      this.data_peers[peerId] = undefined;
    }
  }

  initializeMeshedConnections(callerId,onConnect) {
    if (this.banned_peers.has(callerId)) return allPeers; // don't add this peer, don't open a connection => return empty list.
    if (this.data_peers[callerId]) { // peer is already connected.
      if (this.data_peers[callerId].open) {
        // should we try to get a refreshed list of peers if we have an open connection? For now I would say no.
        if (onConnect) onConnect(callerId);
      }
    }
    // make new peer connection
    let connection = this.peer.connect(callerId);
    connection.on('open', () => {
      connection.on('data',(data) => {
        console.log(`Received data from remote ${callerId}`);
        console.log(data);
        if (data.accept) {
          // should we auto-trust people we call? For now, yes
          this.trusted_peers.add(callerId);
          this.handleNewConnection(connection);
          onConnect(callerId);
        }
        if(data.peers) {
          for (var new_peer of data.peers) {
            if (!this.data_peers[new_peer] && (new_peer != peer.id)) {
              this.initializeMeshedConnections(new_peer,onConnect);

            }
          }
        }
      });
    });
  }

  makeCall(callerId) {
    this.initializeMeshedConnections(callerId,(callId) => {
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





}

