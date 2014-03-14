//Globals
var map;
var gooseNestsURL = "http://env-gis-srv1.uwaterloo.ca:6080/arcgis/rest/services/goosewatch14/gw14_public/FeatureServer/1";
var geometryServiceURL = "http://env-gisdev.uwaterloo.ca/arcgis/rest/services/Utilities/Geometry/GeometryServer";
var routeTaskURL = "http://env-gisdev.uwaterloo.ca/arcgis/rest/services/Campus/uw_route/NAServer/Route?token=oxSF0Agd5ZoDEqJX3b0hcn4im9yhLs-yeQbAgxTn7gfD20WSqbk9qYBpaZMqVwBb86GV79qfaAu_3zsawq3tpzBefVkbcK81hghgCggBWEI.";
var extentLayerURL = "https://services1.arcgis.com/DwLTn0u9VBSZvUPe/arcgis/rest/services/UW_Buildings/FeatureServer/0";
var uwBldgsURL = "https://api.uwaterloo.ca/v2/buildings/list.json?key=cb63602dd1fd2a14332405f8613b68ed&output=json&callback=populateBuildings&jsonp=?";
var submittedPicsURL = "http://env-gis-srv1.uwaterloo.ca:6080/arcgis/rest/services/goosewatch14/gw14_public/FeatureServer/0";
var gooseFL;
var x, y;
var offCampusBuildings = ["AAC","AAR","PHR","ARC","GA","HSC","WSS","180King","RAC","RA2"];
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
var routeAttributionText = "Esri Canada, MappedIn, ";
var routeAttribution = "";
var submittedPicsFL;

require(["esri/map", "esri/arcgis/utils","esri/layers/FeatureLayer","esri/tasks/FeatureSet","esri/layers/GraphicsLayer","esri/symbols/SimpleMarkerSymbol","esri/symbols/SimpleLineSymbol","esri/tasks/RouteTask","esri/tasks/RouteParameters","esri/tasks/GeometryService","esri/tasks/query","esri/geometry/webMercatorUtils","esri/dijit/PopupTemplate","esri/dijit/PopupMobile","esri/renderers/SimpleRenderer","esri/renderers/ScaleDependentRenderer","esri/symbols/PictureMarkerSymbol","dojo/dom-construct","dojo/domReady!"], function(Map,arcgisUtils,FeatureLayer,FeatureSet,GraphicsLayer,SimpleMarkerSymbol,SimpleLineSymbol,RouteTask,RouteParameters,GeometryService,Query,webMercatorUtils,PopupTemplate,PopupMobile,SimpleRenderer,ScaleDependentRenderer,PictureMarkerSymbol,domConstruct){

    $('#carousel').carousel();
    
    var $modals = $('.modal')
    $modals.on('hidden.bs.modal',function(e){
        unPauseEtiquetteCarousel();
    });
    $modals.on('shown.bs.modal',function(e){
        pauseEtiquetteCarousel();
    });
    
    $('#sharePanel').hide()
    
	gsvc = new GeometryService(geometryServiceURL);

	//Create nested feature set to hold nest buffers at three levels
	buildings = new FeatureSet();
	nestBuffers.push(new esri.tasks.FeatureSet());
	nestBuffers.push(new esri.tasks.FeatureSet());
	nestBuffers.push(new esri.tasks.FeatureSet());
	
	//Create the map
	map = new Map("mapDiv",{
		basemap: "topo",
		center: [-80.542, 43.471],
		zoom: 15,
        minZoom: 15,
        maxZoom: 19
	});
	
	//Create a new lat/long point when the user clicks on the map (if in add point mode)
	map.on("click",function(ev){
		if(addPointMode){
			var webmercPt = ev.mapPoint;
			var llPt = webMercatorUtils.webMercatorToGeographic(webmercPt);
			populateLocationFromClick(llPt);
		}
	});
    
    //Modify the data attribution text when the map changes
    map.on("extent-change",function(ev){
        $(".esriAttributionLastItem").text(routeAttribution +  $(".esriAttributionLastItem").text());
    });
	
	
	//Initialize map contents once map has loaded
	map.on("load", initLayers);
	
	

	/**
		initLayers()
		
		Initializes all the layers after the map has loaded
	*/
	function initLayers(){
		//get reference to submitted pictures
        submittedPicsFL = new FeatureLayer(submittedPicsURL);
        
        //Goose nest symbol
        var smallNestSymbol = new PictureMarkerSymbol("img/NestLocationsGoose.svg",30,30);
        var largeNestSymbol = new PictureMarkerSymbol("img/NestLocationsGoose.svg",50,50);
        var smallNestRenderer = new SimpleRenderer(smallNestSymbol);
        var largeNestRenderer = new SimpleRenderer(largeNestSymbol);
        
        var rendererInfos = [
            {
                "renderer": smallNestRenderer,
                "minZoom": 15,
                "maxZoom":16
            },
            {
                "renderer": largeNestRenderer,
                "minZoom":17,
                "maxZoom":19
            }
        ];
        
        var scaleDependentRenderer = new ScaleDependentRenderer();
        scaleDependentRenderer.setRendererInfos(rendererInfos);
		//Create the goose nest feature layer
		//Using MODE_SELECTION because it's the only way I can find to make sure the nests are loaded before making buffers
		gooseFL = new FeatureLayer(gooseNestsURL,{
			mode: FeatureLayer.MODE_SELECTION,
			outFields: ["*"]
		});
        gooseFL.setRenderer(scaleDependentRenderer);
		
		//When the features are selected create the nest buffers
		gooseFL.on("selection-complete",makeNestBuffers);
		//Add attachments if they exist once a new feature is created
		gooseFL.on("edits-complete",attachPhoto);
        //Add attachments when a new photo is submitted
        submittedPicsFL.on("edits-complete",attachNewPhoto);
        
        //Create a new feature layer to hold an extent based on UW building footprints
        extentLayer = new FeatureLayer(extentLayerURL);
		
		//This is based on the forum post here: http://forums.arcgis.com/threads/77989-Display-Image-Attachments-in-Popup
		gooseFL.on("click",function(e){
            pauseEtiquetteCarousel();
			var objectId, el;
			objectId = e.graphic.attributes[gooseFL.objectIdField];
			gooseFL.queryAttachmentInfos(objectId, function (infos) {
				
				
				var d = new Date(e.graphic.attributes.submitdate);
				
				$("#nestDate")[0].innerHTML = d.toLocaleDateString();
				$("#nestDescription")[0].innerHTML = e.graphic.attributes.description;
				$("#nestSubmitter")[0].innerHTML = e.graphic.attributes.submitter;
				$("#nestTwitter")[0].innerHTML = e.graphic.attributes.twitter;
                $("#nestOID")[0].value = e.graphic.attributes.objectid;
                $("#nestX")[0].value = e.graphic.geometry.x;
                $("#nestY")[0].value = e.graphic.geometry.y;

                
                $("#nestImagePlaceholder").hide();
				
				if (!!infos[0]) {
                     if(!!$("#carouselSlides").children()){
                        $("#carouselSlides").children().remove();
                    }

                        $("#nestImagePlaceholder").show();
                    
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
                        if (infos.length == 1){
                            $('.carousel-inner').each(function() {
                                if ($(this).children('div').length === 1) $(this).siblings('.carousel-control, .carousel-indicators').hide();
                            });
                        }
                        else{
                             $('.carousel-inner').each(function() {
                                if ($(this).children('div').length > 1) $(this).siblings('.carousel-control, .carousel-indicators').show();
                            });
                        }
                    }
					$("#nestModal").modal("show");
				
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
        stopSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0,0,0]), 1), new dojo.Color([255,0,0,0.25]));
		routeSymbol = new SimpleLineSymbol().setColor(new dojo.Color([0,255,0,0.75])).setWidth(4);

		
		// Get building data from uWaterloo API
		dojo.io.script.get({
			url: uwBldgsURL
		});
		
		//Add graphics layers to map
		map.addLayer(results);
		//map.addLayer(bufferGraphics,0);
		
		//Select all nests to get them on the map
		var selectAll = new Query;
		selectAll.where = '"status"=1';
		gooseFL.selectFeatures(selectAll,FeatureLayer.SELECTION_NEW);		
        
        centerMapURL();
        
	}  
});

function pauseEtiquetteCarousel(){
    $("#carousel").carousel('pause');
}

function unPauseEtiquetteCarousel(){
    $("#carousel").carousel('cycle');
}
