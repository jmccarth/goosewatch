/**
	locateUser()
	
	Starts the HTML geolocation process and (provided it is supported) uses the returned value to populate the location
	on the submission form.
*/
function locateUser(){
	if(navigator.geolocation){  
		navigator.geolocation.getCurrentPosition(populateLocationFromDevice);
		watchId = navigator.geolocation.watchPosition(populateLocationFromDevice);
	}
	else{
		$("#locationLink")[0].style.color = "red";
		alert("Browser doesn't support Geolocation. Visit http://caniuse.com to discover browser support for the Geolocation API.");
	}
}

/**
	sortSelect()
	
	Sorts the option elements in a select element based on their text content
*/
function sortSelect(selElem) {
	var tmpAry = new Array();
	for (var i=0;i<selElem.options.length;i++) {
		tmpAry[i] = new Array();
		tmpAry[i][0] = selElem.options[i].text;
		tmpAry[i][1] = selElem.options[i].value;
	}
	tmpAry.sort();
	while (selElem.options.length > 0) {
		selElem.options[0] = null;
	}
	for (var i=0;i<tmpAry.length;i++) {
		var op = new Option(tmpAry[i][0], tmpAry[i][1]);
		selElem.options[i] = op;
	}
	return;
}