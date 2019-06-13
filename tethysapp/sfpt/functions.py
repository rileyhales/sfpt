# -*- coding: utf-8 -*-
"""functions.py

    Author: Alan D. Snow, 2015-2017
    License: BSD 3-Clause
"""
import datetime
import os
from glob import glob

from django.contrib import messages
from django.shortcuts import redirect

# GLOBAL
M3_TO_FT3 = 35.3146667


def redirect_with_message(request, url, message, severity="INFO"):
    """
    Redirects to new page with message
    """
    if message not in [m.message for m in messages.get_messages(request)]:
        if severity == "INFO":
            messages.info(request, message)
        elif severity == "WARNING":
            messages.warning(request, message)
        elif severity == "ERROR":
            messages.error(request, message)
    return redirect(url)


def get_ecmwf_valid_forecast_folder_list(main_watershed_forecast_folder, file_extension):
    """
    Retrieves a list of valid forecast folders for the watershed
    """
    directories = sorted(
        [d for d in os.listdir(main_watershed_forecast_folder)
         if os.path.isdir(os.path.join(main_watershed_forecast_folder, d))],
        reverse=True
    )
    output_directories = []
    directory_count = 0
    for directory in directories:
        date = datetime.datetime.strptime(directory.split(".")[0], "%Y%m%d")
        hour = int(directory.split(".")[-1]) / 100
        path_to_files = os.path.join(main_watershed_forecast_folder, directory)
        if os.path.exists(path_to_files):
            basin_files = glob(os.path.join(path_to_files,
                                            "*{0}".format(file_extension)))
            # only add directory to the list if valid
            if len(basin_files) > 0:
                output_directories.append({
                    'id': directory,
                    'text': str(date + datetime.timedelta(hours=int(hour)))
                })
                directory_count += 1
            # limit number of directories
            if directory_count > 64:
                break
    return output_directories


def format_watershed_title(watershed, subbasin):
    """
    Formats title for watershed in navigation
    """
    max_length = 30
    watershed = watershed.strip()
    subbasin = subbasin.strip()
    watershed_length = len(watershed)
    if watershed_length > max_length:
        return watershed[:max_length - 1].strip() + "..."
    max_length -= watershed_length
    subbasin_length = len(subbasin)
    if subbasin_length > max_length:
        return watershed + " (" + subbasin[:max_length - 3].strip() + " ...)"
    return watershed + " (" + subbasin + ")"


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
