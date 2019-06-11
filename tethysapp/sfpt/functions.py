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


def get_ecmwf_valid_forecast_folder_list(main_watershed_forecast_folder,
                                         file_extension):
    """
    Retreives a list of valid forecast folders for the watershed
    """
    directories = \
        sorted(
            [d for d in os.listdir(main_watershed_forecast_folder)
             if os.path.isdir(
                os.path.join(main_watershed_forecast_folder, d))],
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
