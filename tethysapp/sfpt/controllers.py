import json
import os

from django.contrib.auth.decorators import login_required, user_passes_test, permission_required
from django.shortcuts import render
from tethys_sdk.gizmos import SelectInput, ToggleSwitch, TextInput, MessageBox, Button

from .functions import get_ecmwf_valid_forecast_folder_list, format_watershed_title, redirect_with_message
from .model import Watershed, GeoServer

from .app import Sfpt as App


@login_required()
def home(request):
    """
    Controller for the app home page.
    """
    watersheds = SelectInput(
        display_text='Select Watershed(s)',
        name='watershed_select',
        options=[('Central America', 'Merit')],
        multiple=True,
    )

    context = {
        'watersheds': watersheds
    }

    return render(request, 'sfpt/home.html', context)


@login_required()
def animation(request):
    """
    Controller for the streamflow animation page.
    """
    context = {}
    return render(request, 'sfpt/animationmap.html', context)


@login_required()
def map(request):
    """
    Controller for the map viewer page.
    """

    def find_add_attribute_ci(attribute, layer_attributes, contained_attributes):
        """
        Case insensitive attribute search and add
        """
        for layer_attribute in layer_attributes:
            if layer_attribute.lower() == attribute.lower():
                contained_attributes.append(layer_attribute)
                return True
        return False

    def get_watershed_layers_info(a_watershed_list):
        """
        This gets the information about the watershed layers
        """
        a_layers_info = []
        a_boundary_exists = False
        a_gage_exists = False
        a_ahps_station_exists = False
        a_historical_flood_map_exists = False

        # add layer urls to list and add their navigation items as well
        for a_watershed in a_watershed_list:
            ecmwf_watershed_name = a_watershed.ecmwf_data_store_watershed_name \
                if a_watershed.ecmwf_data_store_watershed_name \
                else a_watershed.watershed_name
            ecmwf_subbasin_name = a_watershed.ecmwf_data_store_subbasin_name \
                if a_watershed.ecmwf_data_store_subbasin_name \
                else a_watershed.subbasin_name
            # (get geoserver info)
            # get wms/api url
            geoserver_wms_url = a_watershed.geoserver.url
            if a_watershed.geoserver.url.endswith('/geoserver/rest'):
                geoserver_wms_url = \
                    "%s/ows" % "/".join(
                        a_watershed.geoserver.url.split("/")[:-1]
                    )
            elif a_watershed.geoserver.url.endswith('/geoserver'):
                geoserver_wms_url = "%s/ows" % a_watershed.geoserver.url

            a_geoserver_info = {
                'watershed': a_watershed.watershed_clean_name,
                'subbasin': a_watershed.subbasin_clean_name,
                'ecmwf_watershed': ecmwf_watershed_name,
                'ecmwf_subbasin': ecmwf_subbasin_name,
                'geoserver_url': geoserver_wms_url,
                'title': format_watershed_title(a_watershed.watershed_name, a_watershed.subbasin_name),
                'id': a_watershed.id,
            }

            # LOAD DRAINAGE LINE
            layer_attributes = \
                json.loads(a_watershed.geoserver_drainage_line_layer
                           .attribute_list)
            missing_attributes = []
            contained_attributes = []
            # check required attributes
            # necessary_attributes = ['COMID','watershed', 'subbasin',
            # 'wwatershed','wsubbasin']

            # check COMID/HydroID attribute
            if not find_add_attribute_ci('COMID', layer_attributes,
                                         contained_attributes):
                if not find_add_attribute_ci('HydroID', layer_attributes,
                                             contained_attributes):
                    missing_attributes.append('COMID or HydroID')

            # check ECMWF watershed/subbasin attributes
            if not find_add_attribute_ci('watershed', layer_attributes,
                                         contained_attributes) \
                    or not find_add_attribute_ci('subbasin', layer_attributes,
                                                 contained_attributes):
                missing_attributes.append('watershed')
                missing_attributes.append('subbasin')

            # check optional attributes
            optional_attributes = ['usgs_id', 'nws_id', 'hydroserve']
            for optional_attribute in optional_attributes:
                find_add_attribute_ci(optional_attribute, layer_attributes,
                                      contained_attributes)

            a_geoserver_info['drainage_line'] = {
                'name': a_watershed.geoserver_drainage_line_layer.name,
                'geojson': a_watershed.geoserver_drainage_line_layer.wfs_url,
                'latlon_bbox': json.loads(
                    a_watershed.geoserver_drainage_line_layer.latlon_bbox
                ),
                'projection': a_watershed.geoserver_drainage_line_layer
                    .projection,
                'contained_attributes': contained_attributes,
                'missing_attributes': missing_attributes,
            }
            # check if needed attribute is there to perfrom
            # query based rendering of layer
            query_attribute = []
            if find_add_attribute_ci('Natur_Flow', layer_attributes,
                                     query_attribute):
                a_geoserver_info['drainage_line']['geoserver_method'] = \
                    "natur_flow_query"
                a_geoserver_info['drainage_line'][
                    'geoserver_query_attribute'] = query_attribute[0]
            elif find_add_attribute_ci('RiverOrder', layer_attributes,
                                       query_attribute):
                a_geoserver_info['drainage_line']['geoserver_method'] = \
                    "river_order_query"
                a_geoserver_info['drainage_line']['geoserver_query_attribute'] \
                    = query_attribute[0]
            else:
                a_geoserver_info['drainage_line']['geoserver_method'] \
                    = "simple"

            if a_watershed.geoserver_boundary_layer:
                # LOAD BOUNDARY
                a_geoserver_info['boundary'] = {
                    'name': a_watershed.geoserver_boundary_layer.name,
                    'latlon_bbox': json.loads(a_watershed.geoserver_boundary_layer.latlon_bbox),
                    'projection': a_watershed.geoserver_boundary_layer.projection,
                }
                a_boundary_exists = True
            if a_watershed.geoserver_gage_layer:
                # LOAD GAGE
                a_geoserver_info['gage'] = {
                    'name': a_watershed.geoserver_gage_layer.name,
                    'latlon_bbox':
                        json.loads(
                            a_watershed.geoserver_gage_layer.latlon_bbox),
                    'projection': a_watershed.geoserver_gage_layer.projection,
                }
                a_gage_exists = True

            if a_geoserver_info:
                a_layers_info.append(a_geoserver_info)

        return a_layers_info, a_boundary_exists, a_gage_exists, a_historical_flood_map_exists, a_ahps_station_exists

    # get/check information from AJAX request
    post_info = request.GET
    watershed_ids = post_info.getlist('watershed_select')

    if not watershed_ids:
        # send them home
        msg = "No watershed selected. Please select one then try again"
        return redirect_with_message(request, "..", msg, severity="WARNING")

    session_maker = App.get_persistent_store_database('sfpt_db', as_sessionmaker=True)
    session = session_maker()

    # get base layer info
    path_to_ecmwf_rapid_output = App.get_custom_setting('ecmwf_forecast_folder')

    watershed_list = []
    watershed_layers_info_array = []
    available_forecast_dates = []

    if watershed_ids:
        watersheds = session.query(Watershed) \
            .order_by(Watershed.name, Watershed.subbasin) \
            .filter(Watershed.id.in_(watershed_ids)) \
            .all()

        for watershed in watersheds:
            watershed_list.append((
                "%s (%s)" % (watershed.watershed_name,
                             watershed.subbasin_name),
                "%s:%s" % (watershed.watershed_clean_name,
                           watershed.subbasin_clean_name)
            ))
            # find/check current output datasets
            path_to_watershed_files = \
                os.path.join(
                    path_to_ecmwf_rapid_output,
                    "{0}-{1}".format(watershed.ecmwf_data_store_watershed_name,
                                     watershed.ecmwf_data_store_subbasin_name))
            if path_to_watershed_files and \
                    os.path.exists(path_to_watershed_files):
                available_forecast_dates = \
                    available_forecast_dates + \
                    get_ecmwf_valid_forecast_folder_list(
                        path_to_watershed_files, ".geojson")

        watershed_layers_info_array = get_watershed_layers_info(watersheds)[0]

    # set up the inputs
    watershed_select = SelectInput(
        display_text='Select Watershed',
        name='watershed_select',
        options=watershed_list
    )
    warning_point_date_select = None
    warning_point_forecast_folder = ""
    if available_forecast_dates:
        available_forecast_dates = sorted(available_forecast_dates,
                                          key=lambda k: k['id'], reverse=True)
        warning_point_forecast_folder = available_forecast_dates[0]['id']
        forecast_date_select_input = []
        for date in available_forecast_dates:
            next_row_info = (date['text'], date['id'])
            if next_row_info not in forecast_date_select_input:
                forecast_date_select_input.append(next_row_info)

        warning_point_date_select = SelectInput(
            display_text='Select Forecast Date',
            name='warning_point_date_select',
            options=forecast_date_select_input
        )

    units_toggle_switch = ToggleSwitch(
        display_text='Units:',
        name='units-toggle',
        on_label='Metric',
        off_label='English',
        size='mini',
        initial=True
    )

    context = {
        'watershed_layers_info_array_json': json.dumps(watershed_layers_info_array),
        'watershed_layers_info_array': watershed_layers_info_array,
        'warning_point_forecast_folder': warning_point_forecast_folder,
        'base_layer_info': json.dumps({'name': 'esri'}),
        'watershed_select': watershed_select,
        'warning_point_date_select': warning_point_date_select,
        'units_toggle_switch': units_toggle_switch,
    }
    session.close()
    return render(request, 'sfpt/map.html', context)


@login_required()
def addwatershed(request):
    """
    Controller for the app addwatershed page.
    """
    watershed_name_input = TextInput(
        display_text='Watershed Display Name',
        name='watershed-name-input',
        placeholder='e.g.: Magdalena',
        # icon_append='glyphicon glyphicon-home'
    )

    subbasin_name_input = TextInput(
        display_text='Subbasin Display Name',
        name='subbasin-name-input',
        placeholder='e.g.: El Banco',
        # icon_append='glyphicon glyphicon-tree-deciduous'
    )

    # Query DB for geoservers
    # session_maker = App.get_persistent_store_database('sfpt_db', as_sessionmaker=True)
    # session = session_maker()
    # geoservers = session.query(GeoServer).all()
    # geoserver_list = []
    # for geoserver in geoservers:
    #     geoserver_list.append(("%s (%s)" % (geoserver.name, geoserver.url), geoserver.id))
    # session.close()

    geoserver_select = SelectInput(
        display_text='Which GeoServer will provide the data?',
        name='geoserver-select',
        # options=geoserver_list
        options=[('options', 'options')]
    )

    drainage_name_input = TextInput(
        display_text='Name of the GeoServer workspace and Drainage Line layer',
        name='drainage_name_input',
        placeholder='e.g.: sfpt_data:europe_drainagelines',
        # icon_append='glyphicon glyphicon-tree-deciduous'
    )

    catchment_name_input = TextInput(
        display_text='Name of the GeoServer workspace and Catchment Polygons layer',
        name='drainage_name_input',
        placeholder='e.g.: sfpt_data:europe_catchments',
        # icon_append='glyphicon glyphicon-tree-deciduous'
    )

    add_button = Button(
        display_text='Add Watershed',
        icon='glyphicon glyphicon-plus',
        style='success',
        name='submit-add-watershed',
        attributes={'id': 'submit-add-watershed'}
    )

    context = {
        'watershed_name_input': watershed_name_input,
        'subbasin_name_input': subbasin_name_input,
        'geoserver_select': geoserver_select,
        'drainage_name_input': drainage_name_input,
        'catchment_name_input': catchment_name_input,
        'add_button': add_button,
    }

    return render(request, 'sfpt/add_watershed.html', context)


@login_required()
def addgeoserver(request):
    """
    Controller for the addgeoserver page.
    """
    geoserver_name_input = TextInput(
        display_text='GeoServer Name',
        name='geoserver-name-input',
        placeholder='e.g.: My GeoServer',
        icon_append='glyphicon glyphicon-tag'
    )

    geoserver_url_input = TextInput(
        display_text='GeoServer Url',
        name='geoserver-url-input',
        placeholder='e.g.: http://localhost:8181/geoserver',
        icon_append='glyphicon glyphicon-cloud-download'
    )

    geoserver_username_input = TextInput(
        display_text='GeoServer Username',
        name='geoserver-username-input',
        placeholder='e.g.: admin',
        icon_append='glyphicon glyphicon-user'
    )

    add_button = Button(
        display_text='Add GeoServer',
        icon='glyphicon glyphicon-plus',
        style='success',
        name='submit-add-geoserver',
        attributes={'id': 'submit-add-geoserver'}
    )

    context = {
        'geoserver_name_input': geoserver_name_input,
        'geoserver_url_input': geoserver_url_input,
        'geoserver_username_input': geoserver_username_input,
        'add_button': add_button,
    }

    return render(request, 'sfpt/add_geoserver.html', context)


@login_required()
def managewatersheds(request):
    """
    Controller for the managewatersheds page.
    """
    edit_modal = MessageBox(
        name='edit_watershed_modal',
        title='Edit Watershed',
        message='Loading ...',
        dismiss_button='Nevermind',
        affirmative_button='Save Changes',
        affirmative_attributes='id=edit_modal_submit',
        width=500
    )

    context = {
        # 'watersheds': get_sorted_watershed_list(),
        'edit_modal': edit_modal,
    }

    return render(request, 'sfpt/manage_watersheds.html', context)


@login_required()
def managegeoservers(request):
    """
    Controller for the managegeoservers page.
    """
    context = {}
    return render(request, 'sfpt/manage_geoservers.html', context)


@login_required()
def publications(request):
    """
    Controller for the publications page.
    """
    context = {}
    return render(request, 'sfpt/publications.html', context)


@login_required()
def code(request):
    """
    Controller for the code page.
    """
    context = {}
    return render(request, 'sfpt/code.html', context)


@login_required()
def help(request):
    """
    Controller for the help page.
    """
    context = {}
    return render(request, 'sfpt/help.html', context)
