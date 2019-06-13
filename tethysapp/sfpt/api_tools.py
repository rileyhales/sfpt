import requests

#todo
# headers =
# params =
# put those usual head info things up here and make a general request object
# get the customsetting with the workspace name of the files
# write documentation explaining that you must use the naming conventions listed for the layers on geoserver

gs_wrksp = ''


def watersheds_info():
    return {
        'northamerica': {
            'name': 'North America',
            'delineation': 'API',
            'gs_drainagelines': gs_wrksp + 'north_america-drainage_lines',
            'gs_catchments': gs_wrksp + 'north_america-catchments',
        },
        'centralamerica': {
            'name': 'Central America',
            'delineation': 'API',
            'gs_drainagelines': gs_wrksp + 'central_america-drainage_lines',
            'gs_catchments': gs_wrksp + 'central_america-catchments',
        },
        'southamerica': {
            'name': 'South America',
            'delineation': 'API',
            'gs_drainagelines': gs_wrksp + 'south_america-drainage_lines',
            'gs_catchments': gs_wrksp + 'south_america-catchments',
        },
    }


def watershedlist():
    """
    Makes a list of watersheds formatted for a tethys gizmo [(Name (Delineation), designation)]
    """
    opts = watersheds_info()
    return [(opts[opt]['name'] + ' (' + opts[opt]['delineation'] + ')', opt) for opt in opts]
