////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS
function map(zoomList) {
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
    return {
        "ESRI Terrain": L.layerGroup([L.esri.basemapLayer('Terrain'), L.esri.basemapLayer('TerrainLabels')]).addTo(mapObj),
        "ESRI Imagery": L.layerGroup([L.esri.basemapLayer('Imagery'), L.esri.basemapLayer('ImageryLabels')]),
        "ESRI Topographic": L.esri.basemapLayer('Topographic'),
        "ESRI Grey": L.esri.basemapLayer('Gray'),
    }
}

////////////////////////////////////////////////////////////////////////  WEB MAPPING FEATURE SERVICE EXTENSION
L.TileLayer.WMFS = L.TileLayer.WMS.extend({
    onAdd: function (map) {
        L.TileLayer.WMS.prototype.onAdd.call(this, map);
        map.on('click', this.GetFeatureInfo, this);
    },
    onRemove: function (map) {
        L.TileLayer.WMS.prototype.onRemove.call(this, map);
        map.off('click', this.GetFeatureInfo, this);
    },

    GetFeatureInfo: function (evt) {
        if (document.getElementById('map').style.cursor === 'pointer') {
            // Construct a GetFeatureInfo request URL given a point
            let point = this._map.latLngToContainerPoint(evt.latlng, this._map.getZoom());
            let size = this._map.getSize();
            let params = {
                request: 'GetFeatureInfo',
                service: 'WMS',
                srs: 'EPSG:4326',
                version: this.wmsParams.version,
                format: this.wmsParams.format,
                bbox: this._map.getBounds().toBBoxString(),
                height: size.y,
                width: size.x,
                layers: this.wmsParams.layers,
                query_layers: this.wmsParams.layers,
                info_format: 'application/json'
            };
            params[params.version === '1.3.0' ? 'i' : 'x'] = point.x;
            params[params.version === '1.3.0' ? 'j' : 'y'] = point.y;

            let url = this._url + L.Util.getParamString(params, this._url, true);

            if (url) {
                $.ajax({
                    type: "GET",
                    url: url,
                    info_format: 'application/json',
                    success: function (data) {
                        if (data.features.length !== 0) {
                            console.log('You found stream number ' + data.features[0].properties['OBJECTID'])
                        } else {
                            console.log('No features where you clicked so you got an error ' + data);
                        }
                    },
                });
            } else {
                console.log('Unable to extract the right GetFeatureInfo Url');
            }
        }
    },
});

L.tileLayer.WMFS = function (url, options) {
    return new L.TileLayer.WMFS(url, options);
};

////////////////////////////////////////////////////////////////////////  LAYER ADDING FUNCTIONS
function getCatchments(layername) {
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: .5,
    })
}

function getDrainageLines(layername) {
    // todo experiment with using a vector tile layer here instead of wms for maybe better results. tell gio about it
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

function getWarningPoints(layername) {
    let return_layers = [];
    let url = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetWarningPoints/';

    let return_periods = [2, 10, 20];
    for (let i in return_periods) {
        let rp = return_periods[i];
        console.log(rp);
        let params = {
            watershed_name: layername,
            subbasin_name: 'Continental',
            return_period: rp,
        };
        $.ajax({
            async: false,
            beforeSend: function (request) {
                request.setRequestHeader('Authorization', 'Token 1adf07d983552705cd86ac681f3717510b6937f6');
            },
            url: url + L.Util.getParamString(params),
            contentType: 'application/json',
            success: function (data) {
                // console.log(data);
                return_layers.push(
                    L.vectorGrid.slicer(data, {
                        rendererFactory: L.svg.tile,
                        vectorTileLayerStyles: {
                            sliced: function (properties, zoom) {
                                // console.log(properties);
                                return {
                                    color: 'black',
                                    radius: .5,
                                    weight: 0,
                                    opacity: 1,
                                    stroke: true,
                                    fill: true,
                                    fillColor:
                                        rp === 2 ? '#eaeb00' :
                                            rp === 10 ? '#ff1600' :
                                                rp === 20 ? '#730280' :
                                                    rgb(0, 0, 0, 0),
                                    fillOpacity: 1,
                                }
                            }
                        },
                    })
                )
            },
        });
    }
    console.log(return_layers);
    return L.layerGroup(return_layers)
}

////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapdiv = $("#map");
let watersheds = JSON.parse(mapdiv.attr('watersheds'));
let gsURL = JSON.parse(mapdiv.attr('geoserver_url'))['url'];
let gsWRKSP = JSON.parse(mapdiv.attr('geoserver_url'))['workspace'];

let mapObj;
if (watersheds.length > 1) {
    mapObj = map(zoomLists['all'])
} else {
    mapObj = map(zoomLists[watersheds[0].name])
}
let basemapObj = basemaps();

////////////////////////////////////////////////////////////////////////  SETUP THE LAYER ARRAYS
let warningpt_layers = [];
let drainage_layers = [];
let catchment_layers = [];
for (let i in watersheds) {
    let name = watersheds[i].name;
    warningpt_layers.push([name + ' Warning Points', getWarningPoints(name)]);
    drainage_layers.push([name + ' Drainage Lines', getDrainageLines(watersheds[i]['gs_drainageline'])]);
    catchment_layers.push([name + ' Catchments', getCatchments(watersheds[i]['gs_catchment'])]);
}

////////////////////////////////////////////////////////////////////////  ADD CATCHMENT LAYERS AND THE CONTROLS
let currentlayers = {};
for (let i in catchment_layers) {
    catchment_layers[i][1].addTo(mapObj);
    currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
}
for (let i in warningpt_layers) {
    warningpt_layers[i][1].addTo(mapObj);
    currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  MAP EVENT LISTENERS- MOUSEMOVE, CLICK, ZOOM
let startzoom;

mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});
mapObj.on('zoomstart', function (event) {
    startzoom = event.target.getZoom();
});
mapObj.on('zoomend', function (event) {
    let endzoom = event.target.getZoom();
    let threshold = 8;
    if (startzoom >= threshold && endzoom >= threshold) {
        return  // dont change anything if start+end are both over threshold
    }
    if (startzoom < threshold && endzoom < threshold) {
        return  // dont change anything if start+end are both under threshold
    }
    // change the layers based on what kind of zoom change happened
    currentlayers = {};
    // the warning points will stay at all zoom levels
    for (let i in warningpt_layers) {
        // todo change this so that the warning points are always added last/show up on top
        // todo use the setstyle function to make the circles bigger at larger zoom levels
        currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
    }
    if (endzoom >= threshold) {
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
    }
    // put the map controls back on the map after changing all the layers
    mapObj.removeControl(controlsObj);
    controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj)
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
