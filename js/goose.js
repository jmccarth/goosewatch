//Globals
var map;
var gooseNestsURL = "https://services1.arcgis.com/DwLTn0u9VBSZvUPe/arcgis/rest/services/GooseWatch14/FeatureServer/0";
var geometryServiceURL = "http://env-gisdev.uwaterloo.ca/arcgis/rest/services/Utilities/Geometry/GeometryServer";
var routeTaskURL = "http://env-gisdev.uwaterloo.ca/arcgis/rest/services/Campus/uw_route/NAServer/Route?token=oxSF0Agd5ZoDEqJX3b0hcn4im9yhLs-yeQbAgxTn7gfD20WSqbk9qYBpaZMqVwBb86GV79qfaAu_3zsawq3tpzBefVkbcK81hghgCggBWEI.";
var extentLayerURL = "https://services1.arcgis.com/DwLTn0u9VBSZvUPe/arcgis/rest/services/UW_Buildings/FeatureServer/0";
var uwBldgsURL = "https://api.uwaterloo.ca/v2/buildings/list.json?key=cb63602dd1fd2a14332405f8613b68ed&output=json&callback=populateBuildings&jsonp=?";
var gooseFL;
var x, y;
var offCampusBuildings = ["AAC","AAR","PHR","ARC","GA","HSC","WSS","180King"];
var buildings;
var results;
var stopSymbol, routeSymbol;
var routeParams, routeTask;
var bufferGraphics;
var bufferParams;
var gsvc;
var nestBuffers = [];
var addPointMode = false;
var currentDeviceLoc;
var watchId = -1;
var useDeviceLoc;
var extentLayer;
var alerted = false;

require(["esri/map", "esri/arcgis/utils","esri/layers/FeatureLayer","esri/tasks/FeatureSet","esri/layers/GraphicsLayer","esri/symbols/SimpleMarkerSymbol","esri/symbols/SimpleLineSymbol","esri/tasks/RouteTask","esri/tasks/RouteParameters","esri/tasks/GeometryService","esri/tasks/query","esri/geometry/webMercatorUtils","esri/dijit/PopupTemplate","esri/dijit/PopupMobile","esri/renderers/SimpleRenderer","esri/symbols/PictureMarkerSymbol","dojo/dom-construct","dojo/domReady!"], function(Map,arcgisUtils,FeatureLayer,FeatureSet,GraphicsLayer,SimpleMarkerSymbol,SimpleLineSymbol,RouteTask,RouteParameters,GeometryService,Query,webMercatorUtils,PopupTemplate,PopupMobile,SimpleRenderer,PictureMarkerSymbol,domConstruct){

    $('#carousel').carousel();
    
    var $modals = $('.modal')
    $modals.on('hidden.bs.modal',function(e){
        unPauseEtiquetteCarousel();
    });
    $modals.on('shown.bs.modal',function(e){
        pauseEtiquetteCarousel();
    });
    
	gsvc = new GeometryService(geometryServiceURL);

	// Show start screen
	$(window).load(function(){
		$('#startScreenModal').modal('show');
	});

	//Create nested feature set to hold nest buffers at three levels
	buildings = new FeatureSet();
	nestBuffers.push(new esri.tasks.FeatureSet());
	nestBuffers.push(new esri.tasks.FeatureSet());
	nestBuffers.push(new esri.tasks.FeatureSet());
	
	//Create the map
	map = new Map("mapDiv",{
		basemap: "topo",
		center: [-80.542, 43.471],
		zoom: 16,
	});
	
	//Create a new lat/long point when the user clicks on the map (if in add point mode)
	map.on("click",function(ev){
		if(addPointMode){
			var webmercPt = ev.mapPoint;
			var llPt = webMercatorUtils.webMercatorToGeographic(webmercPt);
			populateLocationFromClick(llPt);
		}
	});
	
	
	//Initialize map contents once map has loaded
	map.on("load", initLayers);
	
	

	/**
		initLayers()
		
		Initializes all the layers after the map has loaded
	*/
	function initLayers(){
		
        //Goose nest symbol
        var nestSymbol = new PictureMarkerSymbol("img/NestLocationsGoose.svg",30,30);
        var nestRenderer = new SimpleRenderer(nestSymbol);
		//Create the goose nest feature layer
		//Using MODE_SELECTION because it's the only way I can find to make sure the nests are loaded before making buffers
		gooseFL = new FeatureLayer(gooseNestsURL,{
			mode: FeatureLayer.MODE_SELECTION,
			outFields: ["*"]
		});
        gooseFL.setRenderer(nestRenderer);
		
		//When the features are selected create the nest buffers
		gooseFL.on("selection-complete",makeNestBuffers);
		//Add attachments if they exist once a new feature is created
		gooseFL.on("edits-complete",attachPhoto);
        
        //Create a new feature layer to hold an extent based on UW building footprints
        extentLayer = new FeatureLayer(extentLayerURL);
		
		//This is based on the forum post here: http://forums.arcgis.com/threads/77989-Display-Image-Attachments-in-Popup
		gooseFL.on("click",function(e){
            pauseEtiquetteCarousel();
			var objectId, el;
			objectId = e.graphic.attributes[gooseFL.objectIdField];
			gooseFL.queryAttachmentInfos(objectId, function (infos) {
				
				
				var d = new Date(e.graphic.attributes.DateSubmit);
				
				$("#nestDate")[0].innerHTML = d.toLocaleDateString();
				$("#nestDescription")[0].innerHTML = e.graphic.attributes.LocDescrip;
				$("#nestSubmitter")[0].innerHTML = e.graphic.attributes.Submitter;
				$("#nestTwitter")[0].innerHTML = e.graphic.attributes.TwitterSub;
                $("#nestOID")[0].value = e.graphic.attributes.FID;
				if(!!$("#carouselSlides").children()){
					$("#carouselSlides").children().remove();
				}
				
				if (!!infos[0]) {
                    for (var i=0; i < infos.length; i++){
                        var slide = document.createElement('div');
                        var attvalue = i==0 ? "item active" : "item";
                        slide.setAttribute('class',attvalue);
                        var el = document.createElement('img');
                        el.setAttribute('src', infos[i].url);
                        el.setAttribute('style','width:90%');
                        slide.appendChild(el);
                        $("#carouselSlides").append(slide);
                    }
					$("#nestModal").modal("show");
				}
				else{
					$("#nestModal").modal("show");
				}
			});
		});
		
		map.addLayer(gooseFL);

		//Create graphics layers to hold buffer graphics and route results
		results = new GraphicsLayer();
		bufferGraphics = new GraphicsLayer();
	  
		//Set up routing parameters
		routeTask = new RouteTask(routeTaskURL);
		routeParams = new RouteParameters();
		routeParams.stops = new FeatureSet();
		routeParams.polygonBarriers = new FeatureSet();
		routeParams.returnPolygonBarriers = true;
		routeParams.outSpatialReference = {"wkid":102100};
		routeParams.doNotLocateOnRestrictedElements = true;
		
		//Routing events
		routeTask.on("solve-complete",showRoute);
		routeTask.on("error",routeErrorHandler);
	  
		//Set up routing symbology
		stopSymbol = new SimpleMarkerSymbol().setStyle(esri.symbol.SimpleMarkerSymbol.STYLE_X).setSize(15);
		stopSymbol.outline.setWidth(3);
		routeSymbol = new SimpleLineSymbol().setColor(new dojo.Color([0,0,255,0.5])).setWidth(4);

		
		// Get building data from uWaterloo API
		dojo.io.script.get({
			url: uwBldgsURL
		});
		
		//Add graphics layers to map
		map.addLayer(results);
		//map.addLayer(bufferGraphics,0);
		
		//Select all nests to get them on the map
		var selectAll = new Query;
		selectAll.where = "1=1";
		gooseFL.selectFeatures(selectAll,FeatureLayer.SELECTION_NEW);			
	}  
});

function pauseEtiquetteCarousel(){
    $("#carousel").carousel('pause');
}

function unPauseEtiquetteCarousel(){
    $("#carousel").carousel('cycle');
}