import {Tableservice} from './tableservice.js';
import {createCookie,readCookie,eraseCookie, prepareModal, showModal, hideModal} from './util.js';



const _MIN_VERSION = 0.1;
const _VERSION = 0.1;

export class Telekneipe {
  constructor() {
    this.service = new Tableservice();
    this.avclub = this.service.avclub;


    // try to read cookies
    this.skipCookies = readCookie("aC")>= _MIN_VERSION ? createCookie("aC",readCookie("aC"),14) : false;
    this.skipFrequent = readCookie("sF") == "2" ? true : false;
    
    if (readCookie("sF") && this.skipCookies) {
      createCookie("sF",readCookie("sF"),14);
      if (parseInt(readCookie("nV"))) {
        createCookie("nV",parseInt(readCookie("nV"))+1,14);
      }
    }

    if (this.skipCookies && readCookie("en")) {
      this.lang = "en";
      createCookie("en","1",14);
    }
  }

  askConnection(connection,alwaysAsk=false) {
    // TODO
    Promise.resolve();
  }

  askStream(call,alwaysAsk=false) {
    return new Promise((resolve,reject) => {
      let quest_text = this.lang == "en" ? "It is as someone tapped you on the shoulder, but when you turn there is nobody there. In the room next to the bar a light starts flickering. The robot asks: " : "Du denkst jemand hätte dir auf die Schulter geklopft, aber als du dich umdrehst ist da niemand. Im Raum neben dem Tresen beginnt ein Licht zu flickern. Der Barkeeper fragt:";
      prepareModal("A Tap On Your Shoulder...",quest_text,false);
      let speech = $("<h3>").text(`Would you like to sit down with ${call.peer}`);
      let quest_choice_yes = $("<li class='fl'>").text(this.lang == "en" ? "Yes" : "Ja").click(() =>{hideModal(); resolve()});
      let quest_choice_no = $("<li class='fl'>").text(this.lang == "en" ? "No" : "Nein").click(() =>{hideModal(); reject()});

      let options = $("<ul>");
      options.append(quest_choice_yes).append(quest_choice_no);
      $('#modalBody').append(speech).append(options);

      showModal(reject);
    });
  }

  logToReceipt(msg) {
    $("#console").append("div").addClass("msg").text(msg);
    // make the button flash
    $("#receiptButton").fadeOut("fast",function() {$("#receiptButton").fadeIn(); });
  }

  logNote(identifier, msg) {
    $("#console").append("div").addClass("msg").text(`You got a message from ${identifier}:`);
    $("#console").append("div").addClass("msg").text(msg);
  }

  showReceipt() {
    $(".receipt").show();
  }

  offerCookies() {
    createCookie("aC",_VERSION,14);
    createCookie("sF","0",14);
    createCookie("nV","1",14);
    if (window.location.pathname.includes("index_en.html")) {
      this.lang = "en";
      createCookie("en","1",14);
    }
  }

  clubMarke() {
    if (this.skipCookies && readCookie("sF") != "1" && parseInt(readCookie("nV")) >= 5) {
      let quest_callback = function(choice) {
        createCookie("sF",choice,14); 
        hideModal(); 
      };

      let quest_text = this.lang == "en" ? "It seems you're here quite often. Do you want to directly go to the barkeep on your next visits?" : "Scheint so als wärst du einer unserer Stammgäste. Möchtest du bei deinen nächsten Besuchen direkt zur Bar geleitet werden?";
      let quest_choice_yes = $("<li class='fl'>").text(this.lang == "en" ? "Yes, please give me a Telekneipe Clubmarke" : "Ja, bitte gebt mir eine Telekneipe Clubmarke").click(quest_callback.bind(this,"2"));
      let quest_choice_no = $("<li class='fl'>").text(this.lang == "en" ? "No, I enjoy the experience (we will not ask again)" : "Nein, mir gefällt die Experience (wir fragen nicht noch mal)").click(quest_callback.bind(this,"1"));
      let quest_choice_next = $("<li class='fl'>").text(this.lang == "en" ? "Maybe next time" : "Vielleicht beim nächsten Mal").click(quest_callback.bind(this,"0"));



      prepareModal("Clubmarke",quest_text,false);
      let list = $("<ul />");
      list.append(quest_choice_yes);
      list.append(quest_choice_no);
      list.append(quest_choice_next);
      $('#modalBody').append(list);
    }
    showModal();    
  }

  getInCallMode() {
    return $('#table_container').is(":visible");
  }

  goInCallMode() {
    return new Promise((resolve,reject) => {
      if (!this.avclub.localStream) {
        $("#hwaccess").show()
        this.avclub.initWebcamStream()
          .then((stream) => {resolve(stream);})
          .catch((error)=>{reject(error)});
      }
      // display our scene      
      $('#table_container').show();
      // hide fabulation
    });
  }

  leaveInCallMode() {
    // hide scene
    $('#table_container').hide();
    // display fabulation
  }


  prepareCall(callerId) {
    // display our scene
    $('#table_container').show();
    // hide callpad
    $('#call_pad').hide();
    this.service.makeCall(callerId);
  }






  
  registerUI() {
    // Register UI events.

    $('#make-call').click(() => {
      this.prepareCall($('#callto-id').val().toLowerCase());
    });


    // bind events triggered from fabulation
    // these should bubble up to the content-class div #catch_events
    $('#catch_events').on("tableservice.host", () => {
      this.goInCallMode();
    });

    $('#catch_events').on("tableservice.call", () => {
      if (!this.avclub.localStream) {
        $("#hwaccess").show()        
        this.avclub.initWebcamStream();
      }
      // display the call screen
      $('#call_pad').show();

    });

    $('#catch_events').on("tableservice.hide_call", () => {
      $("#hwaccess").hide()        
      $('#call_pad').hide();

    });

    $('#catch_events').on("tableservice.end", () => {
      this.avclub.closeCalls()
      this.service.closeConnections()
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

