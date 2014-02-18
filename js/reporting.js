/**
	saveFeature()
	
	Takes the values on the nest submission form and supplements them with the global x and y set elsewhere 
	to create a new point in the goose nests feature layer.
*/
function saveFeature(){
	require(["esri/graphic","esri/geometry/Point","esri/geometry/webMercatorUtils","esri/SpatialReference","esri/layers/FeatureLayer"],function(Graphic,Point,webMercatorUtils,SpatialReference,FeatureLayer){
	
		//Get form elements to populate attributes
		var locDescription = $("#locDesc").val();
		var submitter = $("#submitter").val();
		var twitterSub = $("#twitterHandle").val();
		
	
		
		//Convert global x and y (which are in lat/long) to Web Mercator
		var p = webMercatorUtils.geographicToWebMercator(new Point(x,y,new SpatialReference({wkid:4326})));
		
		//Create a graphic from that point and add it to the feature layer
		var g = new Graphic(p,null,{"LocDescrip":locDescription,"Submitter":submitter,"TwitterSub":twitterSub});
		gooseFL.applyEdits([g],null,null);
	});
}

function attachPhoto(ftrEditResult){
	gooseFL.addAttachment(ftrEditResult.adds[0].objectId,document.getElementById("addNestForm"),
	function(feresult){
		console.log(feresult);
	},
	function(errorResult){
		console.log("Error adding attachment:" + errorResult);
	});
}

/**
	populateLocationFromDevice()
	
	Given a position from HTML geolocation this function populates the coords text box,
	disables editing on it, and notifies the user by changing the button's colour to green.
*/
function populateLocationFromDevice(location){
	//Put coordinates in text box
	var coords = $("#coords");
	x = location.coords.longitude;
	y = location.coords.latitude;
	loc = x + "," + y;
	coords.val(loc);

	//Lock down text box and change colour of map icon
	$("#coords")[0].disabled = true;
	$("#locationLink")[0].style.color = "green";
}

/**
	populateLocationFromClick()
	
	Given a point object set the global x and y to the x and y coordinates of the point.
	Set the coordinates text box to show the point and disable it. 
*/
function populateLocationFromClick(pt){
	x = pt.x;
	y = pt.y;
	var coords = $("#coords");
	var loc = x + "," + y;
	coords.val(loc);
	$("#coords")[0].disabled = true;
	$("#addLocationModal").modal('show');
	//Disable point selection mode so user can interact with the map again
	disablePointSelection();
}

/**
	enablePointSelection()
	
	Sets a flag that enables the user to click on a point on the map and have the resulting x,y coordinate
	used to report a new nest location. This is checked in the map's click handler.
*/
function enablePointSelection(){
	addPointMode = true;
}

/**
	disablePointSelection()
	
	Sets a flag that disables the user's ability to click on the map to create a nest location.
	This is checked in the map's click handler.
*/
function disablePointSelection(){
	addPointMode = false;
}