from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import PersistentStoreDatabaseSetting, CustomSetting


class Sfpt(TethysAppBase):
    """
    Tethys app class for Streamflow Prediction Tool.
    """

    name = 'Streamflow Prediction Tool 2'
    index = 'sfpt:home'
    icon = 'sfpt/images/streams.png'
    package = 'sfpt'
    root_url = 'sfpt'
    color = '#34495e'
    description = 'A visualization tool for 15-day streamflow predictions based on the MERIT DEM, ECMWF ' \
                  'runoff forecasts, the RAPID routing method and historical ERA Interim Data.'
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

            # data management pages
            UrlMap(
                name='addwatershed',
                url='sfpt/addwatershed',
                controller='sfpt.controllers.addwatershed'
            ),
            UrlMap(
                name='addgeoserver',
                url='sfpt/addgeoserver',
                controller='sfpt.controllers.addgeoserver'
            ),
            UrlMap(
                name='managewatersheds',
                url='sfpt/managewatersheds',
                controller='sfpt.controllers.managewatersheds'
            ),
            UrlMap(
                name='managegeoservers',
                url='sfpt/managegeoservers',
                controller='sfpt.controllers.managegeoservers'
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

    def persistent_store_settings(self):
        """
        Define Persistent Store Settings.
        """
        return PersistentStoreDatabaseSetting(
                name='sfpt_db',
                description='Database of sfpt regions, layer sources, metadata',
                initializer='sfpt.model.init_sfpt_db',
                required=True
            ),

    def custom_settings(self):
        custom_settings = (
            CustomSetting(
                name='Geoserver Workspace URL',
                type=CustomSetting.TYPE_STRING,
                description="URL of the workspace on geoserver with the watershed and drainage line shapefiles for "
                            "this app. (e.g. https://tethys.byu.edu/geoserver/gldas/ows).",
                required=True,
            ),
        )
        return custom_settings
