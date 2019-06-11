/*****************************************************************************
 * FILE:    manage_geoservers.js
 * AUTHOR:  Alan D. Snow, Curtis Rae, and Shawn Crawley
 * COPYRIGHT: © 2015-2016 Alan D. Snow, Curtis Rae, and Shawn Crawley. All rights reserved.
 * LICENSE: BSD 3-Clause
 *****************************************************************************/


/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

let ERFP_MANAGE_GEOSERVERS = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
    *                      MODULE LEVEL / GLOBAL VARIABLES
    *************************************************************************/
    let m_uploading_data;

    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    let initializeTableFunctions, getTablePage;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/

    initializeTableFunctions = function() {
        $("#geoserver_table").off();

        $("#geoserver_table").DataTable({
            destroy: true,
            columnDefs: [{
                orderable: false,
                targets: [0, 1]
            }],
            order: [[ 3, "asc" ]]
        });

        //handle the submit update event
        $('#geoserver_table').on("click", ".submit-update-geoserver", function(){
            //scroll back to top
            window.scrollTo(0,0);
            //clear messages
            $('#message').addClass('hidden');
            $('#message').empty()
                .addClass('hidden')
                .removeClass('alert-success')
                .removeClass('alert-info')
                .removeClass('alert-warning')
                .removeClass('alert-danger');

            //check data store input
            let safe_to_submit = {val: true, error:""};
            let parent_row = $(this).parent().parent().parent();
            let geoserver_id = parent_row.find('.geoserver-id').text();
            let geoserver_name = checkTableCellInputWithError(parent_row.find('.geoserver-name'),safe_to_submit);
            let geoserver_url = checkTableCellInputWithError(parent_row.find('.geoserver-url'),safe_to_submit);
            let geoserver_username = checkTableCellInputWithError(parent_row.find('.geoserver-username'),safe_to_submit);
            let geoserver_password = checkTableCellInputWithError(parent_row.find('.geoserver-password-input'),safe_to_submit);

            let data = {
                    geoserver_id: geoserver_id,
                    geoserver_name: geoserver_name,
                    geoserver_url: geoserver_url,
                    geoserver_username: geoserver_username,
                    geoserver_password: geoserver_password,
                    };

            //update database
            let xhr = submitRowData($(this), data, safe_to_submit);
            if (xhr != null) {
                xhr.done(function (data) {
                    addSuccessMessage("Geoserver Update Success!");
                });
            }
        });

        //handle the submit delete event
        $('#geoserver_table').on("click", ".submit-delete-geoserver", function(){
        let data = {
            geoserver_id: $(this).parent().parent().parent()
                                .find('.geoserver-id').text()
                };
            //update database
            let xhr = deleteRowData($(this), data);
            if (xhr != null) {
                xhr.done(function (data) {
                    addSuccessMessage("Geoserver Successfully Deleted!");
                    getTablePage();
                });
            }
        });
    };

    getTablePage = function() {
        $.ajax({
            url: 'table',
            method: 'GET',
            data: {'page': $('#manage_geoservers_table').data('page')},
            success: function(data) {
                $("#manage_geoservers_table").html(data);
                initializeTableFunctions();
            }
        });
    };


    /************************************************************************
    *                  INITIALIZATION / CONSTRUCTOR
    *************************************************************************/

    $(function() {
        m_uploading_data = false;
        initializeTableFunctions();
    }); //document ready
}()); // End of package wrapper