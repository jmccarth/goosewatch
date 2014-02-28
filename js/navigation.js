/**
	populateBuildings()
	
	Goes through the JSON response of building points, builds the 2 pick lists,
	and the featureset object to hold all buildings not in the offCampusBuildings list
*/
function populateBuildings(data){
	
	//Loop through buildings returned from the API
	dojo.forEach(data.data,function(value,index){
		bldg = value.building_code;
		if (offCampusBuildings.indexOf(bldg) == -1){
			//Build option items
			bldgDesc = value.building_code + " (" + value.building_name + ")";
			dojo.byId("buildingSelectorA").options.add(new Option(bldgDesc,bldg));
			dojo.byId("buildingSelectorB").options.add(new Option(bldgDesc,bldg));
			
			//Build a graphic feature for the building location
			var pt = new esri.geometry.Point(value.longitude,value.latitude);
			var sym = new esri.symbol.SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE).setColor(new dojo.Color([255,0,0,0.5]));
			var attr = {"Acronym":value.building_code,"Name":value.building_name};
			var b = new esri.Graphic(pt,sym,attr);
			buildings.features.push(b);
		}
	});
	
	//Sort the two lists based on their text content
	sortSelect(document.getElementById('buildingSelectorA'));
    dojo.byId("buildingSelectorA").options.add(new Option("Use My Location","gps"),0);
    $("#buildingSelectorA").val("gps")
	sortSelect(document.getElementById('buildingSelectorB'));
}

/**
    makeNestBuffers()
    
    Uses a geometry service to Generate a set of buffer polygons at three distances (specified in the bufferParams.distances array).
    Adds the buffer graphics corresponding to the current selection on the fear level drop-down as barriers on the route.
    Adds graphics for all buffers to a nested list (nestBuffers) for quick retrieval.
*/
function makeNestBuffers() {
	require(["esri/symbols/SimpleFillSymbol","esri/symbols/SimpleLineSymbol","esri/tasks/GeometryService","esri/SpatialReference","esri/tasks/BufferParameters","esri/graphic","esri/InfoTemplate"],function(SimpleFillSymbol,SimpleLineSymbol,GeometryService,SpatialReference,BufferParameters,Graphic,InfoTemplate){
        
        
        //Build the list of descriptions for screen readers
        //Using the approach documented here: http://webaim.org/techniques/css/invisiblecontent/
        $("#nestDescriptions")[0].innerHTML = "There are reported goose nests at the following locations: <br/>";
        $.each(gooseFL.graphics,function(i,v){
            $("#nestDescriptions")[0].innerHTML += v.attributes.LocDescrip + ";" ;
        });
        
        //Symbol for nests
        var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 255, 255]), 1),new dojo.Color([210, 105, 30, 0.9]));
			
        dojo.forEach(gooseFL.graphics, function(nest,index){
            var pt = nest.geometry;
            //Build buffers
            //Set up buffer parameters
            bufferParams = new BufferParameters();
            bufferParams.distances = [ 12, 20, 30 ];
            bufferParams.unit = GeometryService.UNIT_METER;
            bufferParams.bufferSpatialReference = new SpatialReference({wkid: 102100});
            bufferParams.outSpatialReference = map.spatialReference;			
            bufferParams.geometries  = [ pt ];
				
            //create a function that returns a function that will call the geometry service on demand
            var buildInfoTemplate = function(nestDesc){
                return function(bufResults){
                    var bufGraphic = new Graphic(bufResults[$("#fearSelector").val()],sfs);
                    //routeParams.polygonBarriers.features.push(bufGraphic);	
                    var bufInfoTemplate = new InfoTemplate();
                    //nestBuffers.features.push(bufGraphic);
                    bufferGraphics.add(bufGraphic);
                    nestBuffers[0].features.push(new Graphic(bufResults[0],sfs));
                    nestBuffers[1].features.push(new Graphic(bufResults[1],sfs));
                    nestBuffers[2].features.push(new Graphic(bufResults[2],sfs));
                };
            };
				
			//Buffer the features and add the results as barriers to the routing task
			gsvc.buffer(bufferParams,buildInfoTemplate(""));
        });
    });
}

/**
	validateAndAddStops()
	
	Validates building selections on routing modal and if they are valid adds them as stops to the network.
*/
function validateAndAddStops(){
	//Clear old routes
	results.clear();
	
	//Clear old stops
	routeParams.stops = new esri.tasks.FeatureSet();
	
	//What are the start and end buildings?
	var buildingA = dojo.byId("buildingSelectorA").value;
	var buildingB = dojo.byId("buildingSelectorB").value;
	
	//if this stays true, find a route
	var findRoute = true;
    
    //if this becomes true use the device location as the start instead of a building
    useDeviceLoc = false;
	
    //Handle the case where a user sets their start location to their current device location
    if (buildingA == "gps"){
        useDeviceLoc = true;
        //locateUser();
        if(navigator.geolocation){  
            navigator.geolocation.getCurrentPosition(addStopFromDeviceLocation);
        }
        else{
            alert("Browser doesn't support Geolocation. Visit http://caniuse.com to discover browser support for the Geolocation API.");
        }
    }
    
	//User has not specified a building
	if (buildingA == ""){
		alert("Please select a valid start location");
		findRoute = false;
	}
	if (buildingB == ""){
		alert("Please select a valid end location");
		findRoute = false;
	}
	
	//Make sure buildings aren't the same
	if (buildingA == buildingB && buildingA != ""){
		alert("Your start and end location must be different");
		findRoute = false;
	}
	
	//All is OK above, find the route
	if (findRoute){
        dojo.forEach(buildings.features, function(value,index){
            if (value.attributes.Acronym == buildingA || value.attributes.Acronym == buildingB){
                //When a building is found add it as a stop
                addStop(value);
            }
        });
	}
}

function addStopFromDeviceLocation(location){
    require(["esri/geometry/Point","esri/graphic","esri/geometry/webMercatorUtils","esri/SpatialReference","esri/tasks/FeatureSet"],function(Point,Graphic,webMercatorUtils,SpatialReference,FeatureSet){
        //Put coordinates in text box
        var coords = $("#coords");
        x = location.coords.longitude;
        y = location.coords.latitude;
        loc = x + "," + y;
        coords.val(loc);
        var pt = new Point(x, y, new SpatialReference({ wkid: 4326 }));
        currentDeviceLoc = new Graphic(pt);
        if (extentLayer.fullExtent.contains(webMercatorUtils.geographicToWebMercator(currentDeviceLoc.geometry))){
            addStop(currentDeviceLoc);
        }
        else{
            alert("Your device is currently off campus. We cannot find a route for you.");
            routeParams.stops = new FeatureSet();
        }
    });
}
/**
	addStop()
	
	Takes a graphic and adds it as a stop to the routing problem. When there are two stops added,
	launch the routing task.
*/
function addStop(stop){
	var barriersToRemove = [];
	
	//Add the stop to the network
	s = results.add(new esri.Graphic(esri.geometry.geographicToWebMercator(stop.geometry),stopSymbol));
	routeParams.stops.features.push(s);
	
	//When there are two (or more) stops solve the network problem. There should never be more than 2 stops.
	if (routeParams.stops.features.length >= 2){
		
		//Reset buffer graphics to match the currently specified fear level
		bufferGraphics.clear();
		var fearval = $("#fearSelector").val();
		dojo.forEach(nestBuffers[fearval].features,function(nestBuf,index){
			routeParams.polygonBarriers.features.push(nestBuf);
			bufferGraphics.add(nestBuf);
		});
		
		//Loop through polygon barriers and check if they contain the start or end point. If so, remove them.
		dojo.forEach(routeParams.polygonBarriers.features,function(barrier,index){
			if(barrier.geometry.contains(routeParams.stops.features[0].geometry) || barrier.geometry.contains(routeParams.stops.features[1].geometry)){
				barriersToRemove.push(index);
			}
		});
		
		//Must reverse list of features to remove to avoid screwing up indices
		dojo.forEach(barriersToRemove.reverse(),function(bIndex){ 
			routeParams.polygonBarriers.features.splice(bIndex,1);
		});
		if(barriersToRemove.length > 0){
			alert("Note, your start or end point is close to a goose nest. Proceed with caution.");
		}
		
		//Solve the routing problem
		routeTask.solve(routeParams);
	}
}

/**
	showRoute()
	
	Called when the route is successfully solved. Displays resulting route on map
	and sets the map's extent to show the entire route.
*/
function showRoute(solveResult){
	results.add(solveResult.result.routeResults[0].route.setSymbol(routeSymbol));
	map.setExtent(solveResult.result.routeResults[0].route.geometry.getExtent(),true);
    //Modify attribution to include additional sources
    routeAttribution = routeAttributionText;
}

/**
	routeErrorHandler()
	Called when something goes wrong with the route.
*/
function routeErrorHandler(err){
	if (useLocation){				
		var bldgB = dojo.byId("buildingSelectorB").value;
		alert("A route could not be found between (" + currLocation.x + ", " + currLocation.y + ") and " + bldgB);
	}
	else{
		var bldgA = dojo.byId("buildingSelectorA").value;
		var bldgB = dojo.byId("buildingSelectorB").value;
		alert("A route could not be found between " + bldgA + " and " + bldgB);
	}
		
	routeParams.stops = new esri.tasks.FeatureSet();
	map.graphics.clear();
	resetRouting();
}