chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {

    //  see if we have an action
    if ('action' in request) {

        //  if we have been told to get the image URL, lets get it and send it over
        if (request.action == 'getImageUrl') {
            control.sendImageUrl();
        }

        if (request.action == 'swapImage') {
            control.swapImage(request.data);
        }

        if (request.action == 'resetImage') {
            control.swapImage(request.sourceImgUrl);
        }

        if (request.action == 'pageFocused') {
            control.init();
        }

    }
});

control = {

    findLoadedImageTmr: null,

    init: function() {

        //  Add the Flambient button to the photo page
        if ($('#flambient-bar').length === 0) {
            var ul = $('<ul>').addClass('button-list')
                .css({'float': 'left', 'list-style': 'none', 'margin': '3px 5px 0', 'padding': 0, 'text-align': 'left', 'width': 'auto'})
                .attr('id', 'flambient-bar')
                .append($('<li>').addClass('first last')
                    .append($('<a>').attr('href', '#').addClass('Butt ywa-track')
                        .click(function() {control.sendImageUrl();})
                        .append($('<span>').addClass('icon').css({'width': 14, 'height': 14, 'margin-right': 7, 'position': 'absolute', 'top': 2, 'display': 'inline-block'})
                                .css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAbJJREFUeNqUkj9rFEEYh5+Znb3bw0tCFFSQiKTXwFpICiMWNqlsFfwQ9jYS/2DjJ7D1A/gZtL0VkqBIGu3EwtzteXv7b3Z8Z285DgxCZnibnXnmfeY3q5xzJEniOMeI41gZD21t3fhlrb2A4K6n0TNH9O6QT0/2qYcFSr5bqVDDTsQsSUbO+BMEWq/KKnK9APWnYuPgG+7kJ98fKqoSmgaMgr1NKMcEntFdd+shnVvWX34lPJzA0BDIZqT6svW+QNf6cojCLkGvR2FZeyXQ8QQnEJ2eh/c24HJPuq0k0aoGWc3wxRfCI4HWDEoIP8PAcecSXDELSHmDYAVUb39gjzKq4UBcnIShqeX6d43hYlFTZq1xC6rZCvh+epPP45hBtXBplCYaZzzfvYexGU0XhZJpyEk/dnd88Kzk6i3H6SQkl05zF0gZ7FS0s39rGY7uKR69nrB9u6QUFa38gnTX3uCs6kCby+NGTuCU6zs183TxDP8bLWgCgrrQhH3F4zcp27GlyhRnz0WurfDpLE8b5yy+88Cxf/CbD08DpieFrOYr4cCcyucaqdFoxFL8HD/5XwEGAImRu+CcY9P/AAAAAElFTkSuQmCC)')
                            )
                        .append($('<span>').addClass('text').css({'margin-left': 18}).html('Flambient'))
                    )
                );
            $('div#main div#primary-column div#nav ul#button-bar').after(ul);
        }

        //  Add the Flambient link on the all sizes pages
        if ($('#flambient-dl').length === 0) {
            var dl = $('<dl>').attr('id', 'flambient-dl').append($('<dt>')
                            .html('Flambient')
                        )
                        .append($('<dd>')
                            .append($('<img>').attr({'width': 14, 'height': 14})
                                .attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAbJJREFUeNqUkj9rFEEYh5+Znb3bw0tCFFSQiKTXwFpICiMWNqlsFfwQ9jYS/2DjJ7D1A/gZtL0VkqBIGu3EwtzteXv7b3Z8Z285DgxCZnibnXnmfeY3q5xzJEniOMeI41gZD21t3fhlrb2A4K6n0TNH9O6QT0/2qYcFSr5bqVDDTsQsSUbO+BMEWq/KKnK9APWnYuPgG+7kJ98fKqoSmgaMgr1NKMcEntFdd+shnVvWX34lPJzA0BDIZqT6svW+QNf6cojCLkGvR2FZeyXQ8QQnEJ2eh/c24HJPuq0k0aoGWc3wxRfCI4HWDEoIP8PAcecSXDELSHmDYAVUb39gjzKq4UBcnIShqeX6d43hYlFTZq1xC6rZCvh+epPP45hBtXBplCYaZzzfvYexGU0XhZJpyEk/dnd88Kzk6i3H6SQkl05zF0gZ7FS0s39rGY7uKR69nrB9u6QUFa38gnTX3uCs6kCby+NGTuCU6zs183TxDP8bLWgCgrrQhH3F4zcp27GlyhRnz0WurfDpLE8b5yy+88Cxf/CbD08DpieFrOYr4cCcyucaqdFoxFL8HD/5XwEGAImRu+CcY9P/AAAAAElFTkSuQmCC')
                                .css({'margin-right': 5, 'vertical-align': 'text-bottom', 'cursor': 'pointer'})
                            )
                            .append($('<a>').attr('href', '#').html('Do it!')).click(function() {control.sendImageUrl();})
                        );
            $($('#all-sizes-header dl')[0]).after(dl);
        }

    },

    sendImageUrl: function() {

        var imgUrl = null;

        //  see if we are on the photo page
        if ($('#main-photo-container img').length > 0) {
            imgUrl = $($('#main-photo-container img')[0]).attr('src');
            chrome.extension.sendRequest({"action": "imgUrl", "imgUrl": imgUrl });
        }

        //  see if we are on the photo page
        if ($('#allsizes-photo img').length > 0) {
            imgUrl = $($('#allsizes-photo img')[0]).attr('src');
            chrome.extension.sendRequest({"action": "imgUrl", "imgUrl": imgUrl });
        }

        //  if we are on the lightbox page, then we'd find that out here
        if ($('#lightbox').length > 0) {
            console.log('we can has lightbox');
            if ($('#lightbox a img.loaded').length === 0) {
                $('#lightbox a img.loaded').on('loaded', function() { console.log('now loaded!');});
            } else {
                control.sendLightboxImageUrl();
            }
        }

    },

    sendLightboxImageUrl: function() {

        var imgUrl = null;

        $('#lightbox a img.loaded').each(function(i, el) {
            //console.log($(el).parent().parent().parent().css('visibility'));
        });

    },

    swapImage: function(data) {
        $('#main-photo-container img').attr('src', data);
        $('#allsizes-photo img').attr('src', data);
    }

};

