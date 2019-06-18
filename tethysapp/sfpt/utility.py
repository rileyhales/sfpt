from django.contrib import messages
from django.shortcuts import redirect


def redirect_with_message(request, url, message, severity="INFO"):
    """
    Redirects to new page with message
    Author: Alan D. Snow, 2015-2017
    """
    if message not in [m.message for m in messages.get_messages(request)]:
        if severity == "INFO":
            messages.info(request, message)
        elif severity == "WARNING":
            messages.warning(request, message)
        elif severity == "ERROR":
            messages.error(request, message)
    return redirect(url)
