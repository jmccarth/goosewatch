/**
	locateUser()
	
	Starts the HTML geolocation process and (provided it is supported) uses the returned value to populate the location
	on the submission form.
*/
function locateUser(){
	if(navigator.geolocation){  
		navigator.geolocation.getCurrentPosition(populateLocationFromDevice,function(error){
            alert("Unable to find your position:" + error.message);
        },{enableHighAccuracy:true, timeout:30000});
		watchId = navigator.geolocation.watchPosition(populateLocationFromDevice,function(error){
            console.log("Unable to find your position:" + error.message);
        },{enableHighAccuracy:true, timeout:30000});
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
    if (location.search != ""){
        //Get query portion of URL (if any)
        var url_query = location.search.split("?")[1];
        var x,y,useButtons,zoom;
        var pt;
        if (url_query !== ""){
            $.each(url_query.split("&"),function(i,v){
                key = v.split("=")[0];
                value = v.split("=")[1];
                if(key=="x"){
                    x = value;
                }
                else if (key=="y"){
                    y = value;
                }
                else if (key=="btns"){
                    useButtons = value;
                }
                else if (key=="zoom"){
                    zoom = value;
                }
            });


            if (useButtons == "false"){
                $("#shareButton").hide();
                $("#submitButton").hide();
                $("#routeButton").hide();
            }

            //make sure both x and y have values
            if (!!x && !!y){
                pt = new Point([x,y]);
                map.centerAndZoom(pt,zoom);
            }

            
        }
    }
});}

function generateShareURL(){
require(["esri/geometry/webMercatorUtils"],function(webMercatorUtils){
    var mapcenter = map.extent.getCenter();
    var geo_pt = webMercatorUtils.webMercatorToGeographic(mapcenter);
    var x = geo_pt.x.toFixed(3);
    var y = geo_pt.y.toFixed(3);
    var zoom = map.getZoom();
    var shareURL = document.URL + "?x=" + x + "&y=" + y + "&zoom=" + zoom;
    $("#shareURL")[0].value = shareURL;
    //alert(shareURL);
    $("#sharePanel").show();
});}
