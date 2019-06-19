from .app import Sfpt as App

api_token = {'Authorization': 'Token 1adf07d983552705cd86ac681f3717510b6937f6'}
App.get_custom_setting('geoserver_workspace')

# request_params = {
#     'watershed_name': 'central_america',
#     'subbasin_name': 'merit',
#     'reach_id': comid,
#     'return_format': 'csv',
#     'stat_type': 'mean'
# }
# resH = requests.get(
#     'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetHistoricData/',
#     params=request_params,
#     headers=api_token
# )
# resH.content


def get_geoserver():
    sds = App.get_spatial_dataset_service('geoserver_name', as_wms=True)
    workspace = App.get_custom_setting('geoserver_workspace')
    url = sds.replace('wms', workspace + '/wms')
    return {
        'workspace': workspace,
        'url': url,
    }


def watersheds_db():
    return {
        'northamerica': {
            'name': 'North America',
            'delineation': 'API',
            'gs_drainageline': 'north_america-continental-drainage_line',
            'gs_catchment': 'north_america-continental-catchment',
        },
        # 'central_america': {
        #     'name': 'Central America',
        #     'delineation': 'API',
        #     'gs_drainageline': 'central_america-drainage_line',
        #     'gs_catchment': 'central_america-catchment',
        # },
        'southamerica': {
            'name': 'South America',
            'delineation': 'API',
            'gs_drainageline': 'south_america-continental-drainage_line',
            'gs_catchment': 'south_america-continental-boundary',
        },
        # 'europe': {
        #     'name': 'Europe',
        #     'delineation': 'API',
        #     'gs_drainageline': 'europe-continental-drainage_line',
        #     'gs_catchment': 'europe-continental-boundary',
        # },
        'africa': {
            'name': 'Africa',
            'delineation': 'API',
            'gs_drainageline': 'africa-continental-drainage_line',
            'gs_catchment': 'africa-continental-boundary',
        },
        'northasia': {
            'name': 'North Asia',
            'delineation': 'API',
            'gs_drainageline': 'asia-north_asia-drainage_line',
            'gs_catchment': 'asia-north_asia-boundary',
        },
    }


def watershedlist():
    """
    Makes a list of watersheds formatted for a tethys gizmo [(Name (Delineation), designation)]
    """
    opts = watersheds_db()
    return [(opts[opt]['name'] + ' (' + opts[opt]['delineation'] + ')', opt) for opt in opts]
