L.TileLayer.WMFS = L.TileLayer.WMS.extend({
    // THESE FUNCTIONS ACTIVATES WHEN ADDING A NEW LAYER
    onAdd: function (map) {
        L.TileLayer.WMS.prototype.onAdd.call(this, map);
        map.on('click', this.GetFeatureInfo, this);
    },
    //THESE FUNCTION ACTIVATES WHEN REMOVING A LAYER
    onRemove: function (map) {
        L.TileLayer.WMS.prototype.onRemove.call(this, map);
        map.off('click', this.GetFeatureInfo, this);
    },

    //THIS FUNCTION GIVES YOU THE URL OF THE WMS SERVICE
    urlGFI: function (latlng) {
        // Construct a GetFeatureInfo request URL given a point
        let point = this._map.latLngToContainerPoint(latlng, this._map.getZoom());
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

        return this._url + L.Util.getParamString(params, this._url, true);
    },

    //THIS FUNCTION ACTIVATES WHEN THERE IS A CLICK ON THE WMS LAYER
    GetFeatureInfo: function (evt) {
        if (document.getElementById('map').style.cursor === 'pointer') {
            let url = this.urlGFI(evt.latlng);

            if (url) {
                $.ajax({
                    type: "GET",
                    url: url,
                    info_format: 'application/json',
                    success: function (data, status, xhr) {
                        if (data.features) {
                            console.log('You found stream number ' + data.features[0].properties['OBJECTID'])
                        } else {
                            console.log(data);
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
