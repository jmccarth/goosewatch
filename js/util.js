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

function centerMapURL(){
require(["esri/geometry/Point"],function(Point){
    //Get query portion of URL (if any)
    var url_query = location.search 
    if (url_query !== ""){
        //Parse out building and room names
        var x = url_query.split("&")[0].split("=")[1];
        var y = url_query.split("&")[1].split("=")[1];
        var zoom = url_query.split("&")[2].split("=")[1];
        var useButtons = url_query.split("&")[3].split("=")[1];
        
        if (useButtons == "false"){
            $("#shareButton").hide();
            $("#submitButton").hide();
            $("#routeButton").hide();
        }
        
        var pt = new Point([x,y]);
        
        map.centerAndZoom(pt,zoom);
    }
});}

function generateShareURL(){
require(["esri/geometry/webMercatorUtils"],function(webMercatorUtils){
    var mapcenter = map.extent.getCenter();
    var geo_pt = webMercatorUtils.webMercatorToGeographic(mapcenter);
    var x = geo_pt.x.toFixed(3);
    var y = geo_pt.y.toFixed(3);
    var zoom = map.getZoom();
    var shareURL = location.origin + "?x=" + x + "&y=" + y + "&zoom=" + zoom;
    
    alert(shareURL);
});}
