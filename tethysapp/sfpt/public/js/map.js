////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS
function map(zoomList) {
    return L.map('map', {
        zoom: zoomList[0],
        minZoom: 3,
        maxZoom: 10,
        boxZoom: true,
        maxBounds: zoomList[1],
        center: zoomList[2],
    })
}

const zoomLists = {
    'all': [3, L.latLngBounds(L.latLng(-100, -270), L.latLng(100, 270)), [20, 0]],
    'North America': [4, L.latLngBounds(L.latLng(20, -140), L.latLng(60, -45)), [40, -95]],
    'South America': [4, L.latLngBounds(L.latLng(-100, -270), L.latLng(100, 270)), [-20, -60]], // todo SA zoom
    'Africa': [4, L.latLngBounds(L.latLng(-40, -30), L.latLng(40, 60)), [0, 21]],
    'North Asia': [4, L.latLngBounds(L.latLng(-100, -270), L.latLng(100, 270)), [40, 98]], // todo north asia zoom
};

function basemaps() {
    return {
        "ESRI Terrain": L.layerGroup([L.esri.basemapLayer('Terrain'), L.esri.basemapLayer('TerrainLabels')]).addTo(mapObj),
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
                            $("#chart_modal").modal('show');
                            getstreamflow(data.features[0].properties['COMID'])
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

function getWarningPoints(layername, rp) {
    let cssclass = rp === 2 ? 'cluster2yr' :
        rp === 10 ? 'cluster10yr' :
            rp === 20 ? 'cluster20yr' :
                'none';
    let fillcolor = rp === 2 ? '#eaeb00' :
        rp === 10 ? '#ff1600' :
            rp === 20 ? '#730280' :
                rgb(0, 0, 0, 0);
    let clustergroup = L.markerClusterGroup({
        maxClusterRadius: 30,
        iconCreateFunction: function (cluster) {
            return L.divIcon({className: cssclass});
        },
    });
    let url = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetWarningPoints/';
    let params = {watershed_name: layername, subbasin_name: 'Continental', return_period: rp,};
    $.ajax({
        async: false,
        headers: {'Authorization': "Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40"},
        url: url + L.Util.getParamString(params),
        contentType: 'application/json',
        success: function (data) {
            for (let point in data.features) {
                let coords = data.features[point].geometry.coordinates;
                clustergroup.addLayer(L.circleMarker([coords[1], coords[0]], {
                    weight: 0,
                    radius: 8,
                    fill: true,
                    fillColor: fillcolor,
                    fillOpacity: 1,
                }))
            }
        }
    });
    return clustergroup
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

////////////////////////////////////////////////////////////////////////  SETUP LAYER ARRAYS, ADD LAYERS + CONTROLS
let warningpt_layers = [];
let drainage_layers = [];
let catchment_layers = [];
let currentlayers = {};
for (let i in watersheds) {
    let name = watersheds[i].name;
    warningpt_layers.push([name + ' 2yr Warning Points', getWarningPoints(name, 2)]);
    warningpt_layers.push([name + ' 10yr Warning Points', getWarningPoints(name, 10)]);
    warningpt_layers.push([name + ' 20yr Warning Points', getWarningPoints(name, 20)]);
    drainage_layers.push([name + ' Drainage Lines', getDrainageLines(watersheds[i]['gs_drainageline'])]);
    catchment_layers.push([name + ' Catchments', getCatchments(watersheds[i]['gs_catchment'])]);
}
for (let i in catchment_layers) {
    catchment_layers[i][1].addTo(mapObj);
    currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
}
for (let i in warningpt_layers) {
    mapObj.addLayer(warningpt_layers[i][1]);
    currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  MAP EVENT LISTENERS- MOUSEMOVE, ZOOM
let startzoom;

mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});
mapObj.on('zoomstart', function (event) {
    startzoom = event.target.getZoom();
});
mapObj.on('zoomend', function (event) {
    let endzoom = event.target.getZoom();
    let threshold = 7;
    if (startzoom >= threshold && endzoom >= threshold) {
        return  // dont change anything if start+end are both over threshold
    }
    if (startzoom < threshold && endzoom < threshold) {
        return  // dont change anything if start+end are both under threshold
    }
    // change the layers based on what kind of zoom change happened
    currentlayers = {};
    if (endzoom >= threshold) {  // less than threshold to more than threshold -> -catchments +drainage
        $("#map").css('cursor', 'pointer');
        for (let i in catchment_layers) {
            controlsObj.removeLayer(catchment_layers[i][1]);
            mapObj.removeLayer(catchment_layers[i][1]);
        }
        for (let i in drainage_layers) {
            drainage_layers[i][1].addTo(mapObj);
            currentlayers[drainage_layers[i][0]] = drainage_layers[i][1];
        }
    } else {  // more than threshold to less than threshold -> +catchments -drainage
        $("#map").css('cursor', '');
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
    for (let i in warningpt_layers) {
        controlsObj.removeLayer(warningpt_layers[i][1]);
        mapObj.removeLayer(warningpt_layers[i][1]);
        warningpt_layers[i][1].addTo(mapObj);  // remove and re-add to keep it on the top
        currentlayers[warningpt_layers[i][0]] = warningpt_layers[i][1];
    }
    mapObj.removeControl(controlsObj);
    controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj)
});

////////////////////////////////////////////////////////////////////////  GET CHART DATA BY AJAX
let dates = {highres: [], dates: []};
let values = {highres: [], max: [], mean: [], min: [], std_dev_range_lower: [], std_dev_range_upper: []};

function titleCase(str) {
    str = str.toLowerCase().split('_');
    for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
}

function getstreamflow(comid) {
    let watershed = "north_america"; // todo make this change every time
    let subbasin = "continental";
    let url = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/';
    let params = {watershed_name: watershed, subbasin_name: subbasin, reach_id: comid, return_format: 'csv'};
    $.ajax({
        type: 'GET',
        async: false,
        url: url + L.Util.getParamString(params),
        dataType: 'text',
        contentType: "text/plain",
        headers: {'Authorization': "Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40"},
        success: function (data) {
            if ($('#long-term-chart').length) {
                Plotly.purge('long-term-chart');
            }
            let allLines = data.split('\n');
            let headers = allLines[0].split(',');

            for (let i = 1; i < allLines.length; i++) {
                let data = allLines[i].split(',');

                if (headers.includes('high_res (m3/s)')) {
                    dates.highres.push(data[0]);
                    values.highres.push(data[1]);
                    if (data[2] !== 'nan') {
                        dates.dates.push(data[0]);
                        values.max.push(data[2]);
                        values.mean.push(data[3]);
                        values.min.push(data[4]);
                        values.std_dev_range_lower.push(data[5]);
                        values.std_dev_range_upper.push(data[6]);
                    }
                } else {
                    dates.dates.push(data[0]);
                    values.max.push(data[1]);
                    values.mean.push(data[2]);
                    values.min.push(data[3]);
                    values.std_dev_range_lower.push(data[4]);
                    values.std_dev_range_upper.push(data[5]);
                }
            }
        },
        complete: function () {
            let mean = {name: 'Mean', x: dates.dates, y: values.mean, mode: "lines", line: {color: 'blue'}};

            let max = {
                name: 'Max',
                x: dates.dates,
                y: values.max,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let min = {
                name: 'Min',
                x: dates.dates,
                y: values.min,
                fill: 'none',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)'}
            };

            let std_dev_lower = {
                name: 'Std. Dev. Lower',
                x: dates.dates,
                y: values.std_dev_range_lower,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let std_dev_upper = {
                name: 'Std. Dev. Upper',
                x: dates.dates,
                y: values.std_dev_range_upper,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let data = [min, max, std_dev_lower, std_dev_upper, mean];

            if (values.highres.length > 0) {
                data.push({
                    name: 'HRES',
                    x: dates.highres,
                    y: values.highres,
                    mode: "lines",
                    line: {color: 'black'}
                });
            }

            let layout = {
                title: titleCase(watershed) + ' Forecast<br>Reach ID: ' + comid,
                xaxis: {title: 'Date'},
                yaxis: {title: 'Streamflow m3/s', range: [0, Math.max(...values.max) + Math.max(...values.max) / 5]},
            };

            Plotly.newPlot("long-term-chart", data, layout);

            // let index = dates.dates.length - 2;
            // console.log(index);
            // getreturnperiods(dates.dates[0], dates.dates[index], watershed, subbasin, comid);

            dates.highres = [];
            dates.dates = [];
            values.highres = [];
            values.max = [];
            values.mean = [];
            values.min = [];
            values.std_dev_range_lower = [];
            values.std_dev_range_upper = [];
        }

    });
}

////////////////////////////////////////////////////////////////////////  THINGS THAT NEED TO BE DONE STILL
// todo get historical data (api)
// todo do we still want the change warning points v time option? how do we do that if they're all from the api? actually how does that work now?
