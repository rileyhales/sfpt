////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS
function map(zoomList) {
    // create the map
    return L.map('map', {
        zoom: zoomList[0],
        minZoom: 2,
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
        "ESRI Imagery": L.layerGroup([Esri_WorldImagery, Esri_Imagery_Labels]).addTo(mapObj),
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

function newLayer(layername) {
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
        // styles: 'boxfill/' + $('#colorscheme').val(),
        // colorscalerange: bounds[$("#dates").val()][$("#variables").val()],
    });
}

////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let wtrshd_info = JSON.parse($("#map").attr('watersheds'));
let gsURL = JSON.parse($("#map").attr('geoserver_url'))['url'];
let gsWRKSP = JSON.parse($("#map").attr('geoserver_url'))['workspace'];

let startzoom;

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

////////////////////////////////////////////////////////////////////////  SETUP THE LAYER ARRAYS
let drainage_layers = [];
let catchment_layers = [];
let warningpt_layers = [];
for (let i in wtrshd_info) {
    drainage_layers.push([wtrshd_info[i].name, newLayer(wtrshd_info[i]['gs_drainageline'])]);
    catchment_layers.push([wtrshd_info[i].name, newLayer(wtrshd_info[i]['gs_catchment'])]);
    // todo ajax get the warning points geojson (api) and add to the layers list
}

////////////////////////////////////////////////////////////////////////  ADD THE FIRST CATCHMENT LAYERS AND CONTROLS
let controls = {};
for (let i in catchment_layers) {
    console.log(catchment_layers[i]);
    catchment_layers[i][1].addTo(mapObj);
    controls[catchment_layers[i][0]] = catchment_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, controls).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  CHANGE THE MAP BASED ON ZOOM LEVELS
mapObj.on('zoomstart', function(ev) {
    startzoom = ev.target.getZoom();
});

mapObj.on('zoomend', function(ev) {
    let currentZoom = ev.target.getZoom();
    if(startzoom >= 6 && currentZoom >= 6) {
        return  // dont change anything if start+end are both over 6
    }
    if(startzoom < 6 && currentZoom < 6) {
        return  // dont change anything if start+end are both under 6
    }

    if(currentZoom >= 6){
        // todo make the controls button update accordingly
        for (let i in catchment_layers) {
            mapObj.removeLayer(catchment_layers[i][1]);
        }
        for (let i in drainage_layers) {
            drainage_layers[i][1].addTo(mapObj);
        }

    }else{
        for (let i in catchment_layers) {
            catchment_layers[i][1].addTo(mapObj);
        }
        for (let i in drainage_layers) {
            mapObj.removeLayer(drainage_layers[i][1]);
        }
    }
});

////////////////////////////////////////////////////////////////////////  THINGS THAT NEED TO BE DONE STILL
//todo listeners
// listener for get chart data from (api)
// get historical data (api)
// other things in the api
// do we still want the change warning points v time option? how do we do that if they're all from the api? actually how does that work now?

//todo
// style the layers based on user controls
// maybe do that and regenerate the legend graphic by changing the line colors?