/*****************************************************************************
 * FILE:    add_geoserver.js
 * AUTHOR:  Alan D. Snow
 * COPYRIGHT: © 2015-2016 Alan D Snow. All rights reserved.
 * LICENSE: BSD 3-Clause
 *****************************************************************************/

jQuery(function() {
    //initialize help blockss
    let help_html = '<p class="help-block hidden">No geoserver name specified.</p>';
    $('#geoserver-name-input').parent().parent().append(help_html);
    help_html = '<p class="help-block hidden">No geoserver url specified.</p>';
    $('#geoserver-url-input').parent().parent().append(help_html);
    help_html = '<p class="help-block hidden">No geoserver username specified.</p>';
    $('#geoserver-username-input').parent().parent().append(help_html);
    
    //handle the submit event
    $('#submit-add-geoserver').click(function(){
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
        //check geoserver input
        let safe_to_submit = {val: true};
        let geoserver_name = checkInputWithError($('#geoserver-name-input'),safe_to_submit);
        let geoserver_url = checkInputWithError($('#geoserver-url-input'),safe_to_submit);
        let geoserver_username = checkInputWithError($('#geoserver-username-input'),safe_to_submit);
        let geoserver_password = checkInputWithError($('#geoserver-password-input'),safe_to_submit);
    
        if(safe_to_submit.val) {
            let submit_button = $(this);
            let submit_button_html = submit_button.html();
            //give user information
            addInfoMessage("Submitting Data. Please Wait.");
            submit_button.text('Submitting ...');
            //update database
            data = {
                    geoserver_name: geoserver_name,
                    geoserver_url: geoserver_url,
                    geoserver_username: geoserver_username,
                    geoserver_password: geoserver_password,
                    };
    
            let xhr = ajax_update_database("submit",data,"geoserver_info");
            xhr.done(function(data) {
                if ('success' in data) {
                    //reset inputs
                    $('#geoserver-name-input').val('');
                    $('#geoserver-url-input').val('');
                    $('#geoserver-username-input').val('');
                    $('#geoserver-password-input').val('');
                    addSuccessMessage("Geoserver Add Success!");
                }
            })
            .always(function() {
                submit_button.html(submit_button_html);
            });
    
        }
    
    });

}); //wait page load