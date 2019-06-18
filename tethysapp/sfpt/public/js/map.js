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
    'all': [3, [20, 0]],
    'North America': [4, [40, -91]],
    'South America': [4, [-20, -60]],
    'Africa': [4, [5, 21]],
    'North Asia': [4, [40, 98]],
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

////////////////////////////////////////////////////////////////////////  LAYER ADDING FUNCTIONS
function getWMS(layername) {
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
    })
}

function getWMFS(layername) {
    return L.tileLayer.WMFS(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
    })
}

function newMapServer(layername) {
    return L.esri.tiledMapLayer({
        url: 'https://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer',
        useCache: true,
        crossOrigin: false,
        useCors: false,
    })
}

function getWFSData(warningarray) {
    let layername = warningarray[0].replace(' Warning Points', '');

    let url = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetWarningPoints/';
    let params = {
        watershed_name: layername,
        subbasin_name: 'Continental',
        return_period: 2,
    };
    $.ajax({
        async: true,
        beforeSend: function (request) {
            request.setRequestHeader('Authorization', 'Token 1adf07d983552705cd86ac681f3717510b6937f6');
        },
        jsonp: false,
        url: url + L.Util.getParamString(params),
        contentType: 'application/json',
        success: function (data) {
            console.log(data);
            warningarray[1].addData(data).addTo(mapObj);
        },
    });
}

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

////////////////////////////////////////////////////////////////////////  SETUP THE LAYER ARRAYS
let warningpt_layers = [];
let drainage_layers = [];
let catchment_layers = [];
for (let i in wtrshd_info) {
    warningpt_layers.push([wtrshd_info[i].name + ' Warning Points', L.geoJSON(false, {}).addTo(mapObj)]);
    drainage_layers.push([wtrshd_info[i].name + ' Drainage Lines', getWMFS(wtrshd_info[i]['gs_drainageline'])]);
    catchment_layers.push([wtrshd_info[i].name + ' Catchments', getWMFS(wtrshd_info[i]['gs_catchment'])]);
}

////////////////////////////////////////////////////////////////////////  ADD CATCHMENT LAYERS AND THE CONTROLS
let currentlayers = {};
for (let i in warningpt_layers) {
    currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
    // getWFSData(warningpt_layers[i]);
}

for (let i in catchment_layers) {
    catchment_layers[i][1].addTo(mapObj);
    currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  MAP EVENT LISTENERS- MOUSEMOVE, CLICK, ZOOM
let startzoom;

mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});

mapObj.on('zoomstart', function (ev) {
    startzoom = ev.target.getZoom();
});
mapObj.on('zoomend', function (ev) {
    let currentZoom = ev.target.getZoom();
    let threshold = 7;

    // check for uninteresting cases in zoom changes
    if (startzoom >= threshold && currentZoom >= threshold) {
        return  // dont change anything if start+end are both over threshold
    }
    if (startzoom < threshold && currentZoom < threshold) {
        return  // dont change anything if start+end are both under threshold
    }

    // change the layers based on what kind of zoom change happened
    currentlayers = {};
    for (let i in warningpt_layers) {
        currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
    }
    if (currentZoom >= threshold) {
        $("#map").css('cursor', 'pointer');
        // started less than threshold and went to more than threshold -> -catchments +drainage
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
        $("#map").css('cursor', '');
        // started more than threshold and went to less than threshold -> +catchments -drainage
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
