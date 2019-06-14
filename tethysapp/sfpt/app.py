from tethys_sdk.app_settings import CustomSetting, SpatialDatasetServiceSetting
from tethys_sdk.base import TethysAppBase, url_map_maker


#todo General Items
# fix the animation map when chris fixes it
# talk to michael about the specifics of the new api
# Integrate this app with old app for showing other models? Or not, too much work? i say let this app be standalone
# write documentation explaining that you must use the naming conventions listed for the layers on geoserver
# add the rest of the global regions just for funsies


class Sfpt(TethysAppBase):
    """
    Tethys app class for Streamflow Prediction Tool.
    """

    name = 'SFPT API Interface'
    index = 'sfpt:home'
    icon = 'sfpt/images/streams.png'
    package = 'sfpt'
    root_url = 'sfpt'
    color = '#34495e'
    description = 'A tool for viewing 15-day streamflow predictions, available by API, based on the MERIT DEM, ECMWF ' \
                  'runoff forecasts, the RAPID routing method, and historical ERA Interim Data.'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            # primary navigable for the app
            UrlMap(
                name='home',
                url='sfpt',
                controller='sfpt.controllers.home'
            ),
            UrlMap(
                name='animation',
                url='sfpt/animation',
                controller='sfpt.controllers.animation'
            ),
            UrlMap(
                name='map',
                url='sfpt/map',
                controller='sfpt.controllers.map'
            ),

            # pages for the references in the app
            UrlMap(
                name='publications',
                url='sfpt/publications',
                controller='sfpt.controllers.publications'
            ),
            UrlMap(
                name='code',
                url='sfpt/code',
                controller='sfpt.controllers.code'
            ),
            UrlMap(
                name='help',
                url='sfpt/help',
                controller='sfpt.controllers.help'
            ),

            # ajax controllers for the app
        )

        return url_maps

    def custom_settings(self):
        """
        Define Custom Settings
        """
        custom_settings = (
            CustomSetting(
                name='geoserver_workspace',
                type=CustomSetting.TYPE_STRING,
                description='The name of the workspace that contains the SFPT-API drainage lines and catchments on the '
                            'GeoServer that you specified in Spatial Dataset Service Settings',
                required=True,
            ),
        )
        return custom_settings

    def spatial_dataset_service_settings(self):
        """
        Define Spatial Dataset Service Settings (Geoserver)
        """
        sds_settings = (
            SpatialDatasetServiceSetting(
                name='geoserver_name',
                description='GeoServer that will serve the spatial data services for the app',
                engine=SpatialDatasetServiceSetting.GEOSERVER,
                required=True,
            ),
        )
        return sds_settings
