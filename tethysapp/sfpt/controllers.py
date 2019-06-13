import json
import os

from django.contrib.auth.decorators import login_required, user_passes_test, permission_required
from django.shortcuts import render
from tethys_sdk.gizmos import SelectInput, ToggleSwitch, TextInput, MessageBox, Button

from .functions import get_ecmwf_valid_forecast_folder_list, format_watershed_title, redirect_with_message
from .model import Watershed, GeoServer
from .api_tools import watershedlist, watersheds_info

from .app import Sfpt as App


@login_required()
def home(request):
    """
    Controller for the app home page.
    """
    watersheds = SelectInput(
        display_text='Select Watershed(s)',
        name='watershed_select',
        options=watershedlist(),
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

    # get/check information from AJAX request
    post_info = request.GET
    watershed_ids = post_info.getlist('watershed_select')

    # if there was no watershed selected, return to home page with warning
    if not watershed_ids:
        msg = "No watershed selected. Please select one then try again"
        return redirect_with_message(request, "..", msg, severity="WARNING")

    watershed_list = []
    available_forecast_dates = []

    # watersheds = session.query(Watershed) \
    #     .order_by(Watershed.name, Watershed.subbasin) \
    #     .filter(Watershed.id.in_(watershed_ids)) \
    #     .all()
    # session.close()

    watersheds = []
    
    for watershed in watersheds:
        watershed_list.append(
            ("%s (%s)" % (watershed.watershed_name, watershed.subbasin_name),
                "%s:%s" % (watershed.watershed_clean_name, watershed.subbasin_clean_name))
        )
        # find/check current output datasets
        # watershed_files_path = os.path.join(path_to_ecmwf_rapid_output,
        #                                     "{0}-{1}".format(watershed.ecmwf_data_store_watershed_name,
        #                                                      watershed.ecmwf_data_store_subbasin_name))
        # if os.path.exists(watershed_files_path):
        #     available_forecast_dates = available_forecast_dates + \
        #                                get_ecmwf_valid_forecast_folder_list(watershed_files_path, ".geojson")

    watersheds_information = watersheds_info()

    # set up the inputs
    watershed_select = SelectInput(
        display_text='Select Watershed',
        name='watershed_select',
        options=watershed_list
    )

    warning_point_date_select = None
    warning_point_forecast_folder = ""
    if available_forecast_dates:
        available_forecast_dates = sorted(available_forecast_dates, key=lambda k: k['id'], reverse=True)
        warning_point_forecast_folder = available_forecast_dates[0]['id']
        forecast_date_select_input = []
        for available_forecast_date in available_forecast_dates:
            next_row_info = (available_forecast_date['text'], available_forecast_date['id'])
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

    print(watersheds_information)

    context = {
        'watersheds_information': watersheds_information,
        'warning_point_forecast_folder': warning_point_forecast_folder,
        'watershed_select': watershed_select,
        'warning_point_date_select': warning_point_date_select,
        'units_toggle_switch': units_toggle_switch,
    }
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
    session_maker = App.get_persistent_store_database('sfpt_db', as_sessionmaker=True)
    session = session_maker()
    geoservers = session.query(GeoServer).all()
    geoserver_list = []
    for geoserver in geoservers:
        geoserver_list.append(("%s (%s)" % (geoserver.name, geoserver.url), geoserver.id))
    session.close()

    geoserver_select = SelectInput(
        display_text='Which GeoServer will provide the data?',
        name='geoserver-select',
        # options=geoserver_list
        options=geoserver_list
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
