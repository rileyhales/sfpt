////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS
function map(zoomList) {
    // create the map
    return L.map('map', {
        zoom: zoomList[0],
        minZoom: 3,
        boxZoom: true,
        maxBounds: L.latLngBounds(L.latLng(-100.0, -270.0), L.latLng(100.0, 270.0)),
        center: zoomList[1],
    })
}

const zoomLists = {
    'all': [3, [20,0]],
    'North America': [4, [40, -91]],
    'South America': [4, [-15, -60]],
    'Africa': [4, [5, 21]],
};

function basemaps() {
    // create the basemap layers
    let Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    let Esri_WorldTerrain = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {maxZoom: 13});
    let Esri_Imagery_Labels = L.esri.basemapLayer('ImageryLabels');
    return {
        "ESRI Topographic": L.esri.basemapLayer('Topographic').addTo(mapObj),
        "ESRI Imagery": L.layerGroup([Esri_WorldImagery, Esri_Imagery_Labels]),
        "ESRI Terrain": L.layerGroup([Esri_WorldTerrain, Esri_Imagery_Labels])
    }
}

function makeControls() {
    return L.control.layers(basemapObj, {
        'GLDAS Layer': layerObj,
        'Drawing': drawnItems,
        'Europe': europe,
        'Asia': asia,
        'Middle East': middleeast,
        'North America': northamerica,
        'Central America': centralamerica,
        'South America': southamerica,
        'Africa': africa,
        'Australia': australia,
    }).addTo(mapObj);
}

////////////////////////////////////////////////////////////////////////  LAYER ADDING FUNCTIONS
function newWMS(layername) {
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
    });
}

// todo ajax get the warning points geojson (api) and add to the layers list
// declare a placeholder layer for all the geojson layers you want to add
// function layerPopups(feature, layer) {
//     let region = feature.properties.name;
//     layer.bindPopup('<a class="btn btn-default" role="button" onclick="getShapeChart(' + "'" + region + "'" + ')">Get timeseries (average) for ' + region + '</a>');
// }
// let jsonparams = {
//     onEachFeature: layerPopups,
//     style: {color: $("#gjColor").val(), opacity: $("#gjOpacity").val(), weight: $("#gjWeight").val(), fillColor: $("#gjFillColor").val(), fillOpacity: $("#gjFillOpacity").val()}
// };
// gets the geojson layers from the API asynchronously, adding when finished??
// function getGEOJSON(geoserverlayer, leafletlayer) {
//     let parameters = L.Util.extend({
//         service: 'WFS',
//         version: '1.0.0',
//         request: 'GetFeature',
//         typeName: 'gldas:' + geoserverlayer,
//         maxFeatures: 10000,
//         outputFormat: 'application/json',
//         parseResponse: 'getJson',
//         srsName: 'EPSG:4326',
//         crossOrigin: 'anonymous'
//     });
//     $.ajax({
//         async: true,
//         jsonp: false,
//         url: geoserverbase + L.Util.getParamString(parameters),
//         contentType: 'application/json',
//         success: function (data) {
//             leafletlayer.addData(data).addTo(mapObj);
//         },
//     });
// }


////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapdiv = $("#map");
let wtrshd_info = JSON.parse(mapdiv.attr('watersheds'));
let gsURL = JSON.parse(mapdiv.attr('geoserver_url'))['url'];
let gsWRKSP = JSON.parse(mapdiv.attr('geoserver_url'))['workspace'];

let mapObj;
if (wtrshd_info.length > 1) {
    mapObj = map(zoomLists['all'])
} else {
    mapObj = map(zoomLists[wtrshd_info[0].name])
}
let basemapObj = basemaps();

mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});

let startzoom;

////////////////////////////////////////////////////////////////////////  SETUP THE LAYER ARRAYS
let drainage_layers = [];
let catchment_layers = [];
let warningpt_layers = [];
for (let i in wtrshd_info) {
    drainage_layers.push([wtrshd_info[i].name + ' Drainage Lines', newWMS(wtrshd_info[i]['gs_drainageline'])]);
    catchment_layers.push([wtrshd_info[i].name + ' Catchments', newWMS(wtrshd_info[i]['gs_catchment'])]);
    warningpt_layers.push([wtrshd_info[i].name + ' Warning Points', L.geoJSON(false, jsonparams)]);
}

////////////////////////////////////////////////////////////////////////  ADD CATCHMENT LAYERS AND CONTROLS
let currentlayers = {};
for (let i in catchment_layers) {
    console.log(catchment_layers[i]);
    catchment_layers[i][1].addTo(mapObj);
    currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  CHANGE THE MAP BASED ON ZOOM LEVELS
mapObj.on('zoomstart', function(ev) {
    startzoom = ev.target.getZoom();
});

mapObj.on('zoomend', function(ev) {
    let currentZoom = ev.target.getZoom();

    // check for uninteresting cases in zoom changes
    if(startzoom >= 6 && currentZoom >= 6) {
        return  // dont change anything if start+end are both over 6
    }
    if(startzoom < 6 && currentZoom < 6) {
        return  // dont change anything if start+end are both under 6
    }

    // change the layers based on what kind of zoom change happened
    currentlayers = {};
    if (currentZoom >= 6) {
        // started less than 6 and went to more than 6 -> -catchments +drainage
        for (let i in catchment_layers) {
            controlsObj.removeLayer(catchment_layers[i][1]);
            mapObj.removeLayer(catchment_layers[i][1]);
        }
        for (let i in drainage_layers) {
            drainage_layers[i][1].addTo(mapObj);
            currentlayers[drainage_layers[i][0]] = drainage_layers[i][1];
        }
        mapObj.removeControl(controlsObj);
        controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj)
    } else {
        // started more than 6 and went to less than 6 -> +catchments -drainage
        for (let i in catchment_layers) {
            catchment_layers[i][1].addTo(mapObj);
            currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
        }
        for (let i in drainage_layers) {
            controlsObj.removeLayer(drainage_layers[i][1]);
            mapObj.removeLayer(drainage_layers[i][1]);
        }
        mapObj.removeControl(controlsObj);
        controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj)
    }
});

////////////////////////////////////////////////////////////////////////  THINGS THAT NEED TO BE DONE STILL
//todo listeners
// listener for get chart data (from api)
// get historical data (api)
// other things in the api? the lat/lon chooser?
// do we still want the change warning points v time option? how do we do that if they're all from the api? actually how does that work now?

//todo
// maybe style the layers based on user controls
// if so then regenerate the legend graphic by changing svg colors