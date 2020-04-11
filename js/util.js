function createCookie(name,value,days) {
	if (days) {
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
	return true;
}

function readCookie(name) {
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name,"",-1);
}


function prepareModal(header,body,alert=false) {
	$('#modalHeader').text(header);
	$('#modalBody').text(body);
	$('#modalWarning').text('');
	alert ? $('#betaWarning').addClass("modal-warn-background") : $('#betaWarning').removeClass("modal-warn-background");
}

function showModal() {
	$("#betaWarning").show();
}

function hideModal() {
	$("#betaWarning").fadeOut("slow");	
}


export {createCookie,readCookie,eraseCookie, prepareModal, showModal, hideModal}


