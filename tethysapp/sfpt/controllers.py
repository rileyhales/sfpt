import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from tethys_sdk.gizmos import SelectInput, ToggleSwitch

from .api_tools import watershedlist, watersheds_db, get_geoserver
from .utility import redirect_with_message


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
    info = watersheds_db()
    watersheds_info = []
    for i in range(len(watershed_ids)):
        watersheds_info.append(info[watershed_ids[i]])

    # if there was no watershed selected, return to home page with warning
    if not watershed_ids:
        msg = "No watershed selected. Please select one then try again"
        return redirect_with_message(request, "..", msg, severity="WARNING")

    available_forecast_dates = []
    watersheds = watershedlist()

    # set up the inputs
    watershed_select = SelectInput(
        display_text='Select Watershed',
        name='watershed_select',
        options=watersheds
    )
    units_toggle_switch = ToggleSwitch(
        display_text='Units:',
        name='units-toggle',
        on_label='Metric',
        off_label='English',
        size='mini',
        initial=True
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

    context = {
        'watersheds_info': json.dumps(watersheds_info),
        'geoserver_url': json.dumps(get_geoserver()),
        'warning_point_forecast_folder': warning_point_forecast_folder,
        'watershed_select': watershed_select,
        'warning_point_date_select': warning_point_date_select,
        'units_toggle_switch': units_toggle_switch,
    }
    return render(request, 'sfpt/map.html', context)


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
