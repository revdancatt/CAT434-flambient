aesthetic = {

    tab: null,
    imageData: null,
    tileMap: null,
    tileObj: null,
    tilesAcross: 16,
    sourceImgUrl: null,
    flambiented: false,

    loadImage: function(imgUrl) {

        if (imgUrl.length <= 100) {
            aesthetic.sourceImgUrl = imgUrl;
            aesthetic.flambiented = true;
        } else {
            chrome.tabs.sendRequest(aesthetic.tab.id, {action: "resetImage", sourceImgUrl: aesthetic.sourceImgUrl});
            aesthetic.flambiented = false;
            return;
        }

        $('img#sourceImage').remove();
        $('#sourceHolder').append($('<img>').attr('id', 'sourceImage'));
        $('img#sourceImage').load(function() {aesthetic.copyToCanvas();});
        $('img#sourceImage').attr('src', imgUrl);

    },

    copyToCanvas: function() {

        $('#sourceCanvas').remove();
        $('#sourceHolder').append($('<canvas>').attr({'id': 'sourceCanvas'}));
        $('#sourceCanvas').attr({'width': $('img#sourceImage').width(), 'height': $('img#sourceImage').height()});
        $('#sourceCanvas').css({'width': $('img#sourceImage').width() + 'px', 'height': $('img#sourceImage').height() + 'px'});

        var c=$('#sourceCanvas')[0];
        var ctx=c.getContext("2d");
        ctx.drawImage($("img#sourceImage")[0], 0, 0);

        //  grab the source image data (so we can pull the pixels)
        //  and pop it into the aesthetic object
        var imageData = ctx.getImageData(0, 0, $('img#sourceImage').width(), $('img#sourceImage').height());
        aesthetic.imageData = imageData;
      
        //  right then, this may get messy, I want to divide the image up pretty well, about 20 tiles across seems to be
        //  a good value, so lets kick off with that
        var tileObj = {
          across: aesthetic.tilesAcross,
          down: null,
          width: null,
          height: null,
          imgWidth: $('img#sourceImage').width(),
          imgHeight: $('img#sourceImage').height()
        };

        //  So, as we want the source tiles to be as square as possible we need to work out how many pixels wide,
        //  and then how many of those we can fit down (rounding up)
        tileObj.width = Math.floor(tileObj.imgWidth/tileObj.across);
        tileObj.down = Math.ceil(tileObj.imgHeight/tileObj.width);
        tileObj.height = Math.floor(tileObj.imgHeight/tileObj.down);

        //  Because maths is hard, and I don't want to have to work out which top, left, right, bottom quarter a pixel
        //  falls in, because it's late and I'm tired, instead I'm just going to draw an image with the 4 quarters
        //  in different colours. Then grab the image data back from the thing we just drew, looping over it and
        //  grabbing the colours back out, and stuffing the results into an array
        //
        //  This all makes perfect sense!!

        $('#tileMap').remove();
        $('#hiddenStuff').append($('<canvas>').attr({'id': 'tileMap'}));
        $('#tileMap').attr({'width': tileObj.width, 'height': tileObj.height});
        $('#tileMap').css({'width': tileObj.width + 'px', 'height': tileObj.height + 'px'});
        
        var tm=$('#tileMap')[0];
        var tmx=tm.getContext("2d");

        //  Top quarter
        tmx.fillStyle="rgb(0, 0, 255)";
        tmx.beginPath();
        tmx.moveTo(0, 0); tmx.lineTo(tileObj.width, 0); tmx.lineTo(tileObj.width/2, tileObj.height/2); tmx.lineTo(0, 0);
        tmx.closePath();
        tmx.fill();

        //  Right quarter
        tmx.fillStyle="rgb(255, 0, 0)";
        tmx.beginPath();
        tmx.moveTo(tileObj.width, 0); tmx.lineTo(tileObj.width, tileObj.height); tmx.lineTo(tileObj.width/2, tileObj.height/2); tmx.lineTo(tileObj.width, 0);
        tmx.closePath();
        tmx.fill();

        //  left quarter
        tmx.fillStyle="rgb(0, 255, 0)";
        tmx.beginPath();
        tmx.moveTo(0, 0); tmx.lineTo(0, tileObj.height); tmx.lineTo(tileObj.width/2, tileObj.height/2); tmx.lineTo(0, 0);
        tmx.closePath();
        tmx.fill();

        //  Bottom quarter
        tmx.fillStyle="rgb(255, 0, 255)";
        tmx.beginPath();
        tmx.moveTo(0, tileObj.height); tmx.lineTo(tileObj.width, tileObj.height); tmx.lineTo(tileObj.width/2, tileObj.height/2); tmx.lineTo(0, tileObj.height);
        tmx.closePath();
        tmx.fill();

        //  Ok, now we have that draw out let's grab the image data out and then
        //  work out which pixel is top, left, right or bottom
        var mapData = tmx.getImageData(0, 0, tileObj.width, tileObj.height);
        var tileMap = [];

        var pxlObj = {
          r: null,
          g: null,
          b: null,
          a: null
        };

        for (var x = 0; x < tileObj.width; x++) {
          tileMap[x] = [];
          for (var y = 0; y < tileObj.height; y++) {
            pxlObj.r = mapData.data[((y*tileObj.width)+x)*4+0];
            pxlObj.g = mapData.data[((y*tileObj.width)+x)*4+1];
            pxlObj.b = mapData.data[((y*tileObj.width)+x)*4+2];
            pxlObj.a = mapData.data[((y*tileObj.width)+x)*4+3];

            tileMap[x][y] = null;
            if (pxlObj.r < 32 && pxlObj.g < 32 && pxlObj.b > 192) tileMap[x][y] = 'top';
            if (pxlObj.r > 192 && pxlObj.g < 32 && pxlObj.b < 32) tileMap[x][y] = 'right';
            if (pxlObj.r < 32 && pxlObj.g > 192 && pxlObj.b < 32) tileMap[x][y] = 'left';
            if (pxlObj.r > 192 && pxlObj.g < 32 && pxlObj.b > 192) tileMap[x][y] = 'bottom';
          }
        }

        aesthetic.tileObj = tileObj;
        aesthetic.tileMap = tileMap;

        aesthetic.renderTiles();

    },

    renderTiles: function() {



        //  To do this we are dividing the source image into a grid of 7x7 squares, we'll then average the
        //  top, bottom, left & right quarters and work out which quarter is closest to its adjacent ones
        //  then we'll take the average between those two quarters and fill in the diagonal half with them
        //  and same for the other half, and this render the image in triangles
        var imageData = aesthetic.imageData;

        //  resize the canvas
        $('#targetCanvas').remove();
        $('#targetHolder').append($('<canvas>').attr({'id': 'targetCanvas'}));
        $('#targetCanvas').attr({'width': aesthetic.tileObj.imgWidth, 'height': aesthetic.tileObj.imgHeight});
        $('#targetCanvas').css({'width': aesthetic.tileObj.imgWidth + 'px', 'height': aesthetic.tileObj.imgHeight + 'px'});
        
        var ct=$('#targetCanvas')[0];
        var ctxt=ct.getContext("2d");

        //  Ok, now the new way of doing the tile thing around here, first we're going to loop thru the source image
        //  in tile sized chunks, and then when we're looking at each tile loop through the pixels in each one
        //  working out if they are in the top, left, right or bottom (or null) quarter, totting up the values
        //  as we go, then averaging at the end.
        var counter = {};
        var tilePixel = null;
        var sourcePixel = null;
        var qa = ['top', 'left', 'right', 'bottom'];

        //  take big steps through the source image, one tile area at a time
        for (var tileY = 0; tileY < aesthetic.tileObj.down; tileY++) {
            for (var tileX = 0; tileX < aesthetic.tileObj.across; tileX++) {

                //  zero all the rgb values
                counter.top = {r: 0, g: 0, b: 0, count: 0};
                counter.left = {r: 0, g: 0, b: 0, count: 0};
                counter.right = {r: 0, g: 0, b: 0, count: 0};
                counter.bottom = {r: 0, g: 0, b: 0, count: 0};

                //  To start we we need to know how many rows of pixels we are down, if the source image was
                //  140 pixels wide, and tileY = 1 (i.e. the 2nd tile row down), we would need 7 rows of 140 pixels
                //  to be our initial offset. The full width of pixels is tiles across * tile width.
                tilePixel = (Math.floor(tileY * aesthetic.tileObj.imgHeight / aesthetic.tileObj.down) * aesthetic.tileObj.imgWidth);

                //  Then we need to move a number of pixels in, based on the tileX positon
                tilePixel += Math.floor(tileX * aesthetic.tileObj.imgWidth / aesthetic.tileObj.across);

                //  Once we know that we have the pixel offset position of the top left pixel of the tile we are
                //  currently on

                //  NOTE, we still need to multiply up by 4 because there are 4 values r, b, g & a per pixel in the
                //  image data.

                //  step through all the pixels
                for (var y = 0; y < aesthetic.tileObj.height; y++) {
                    for (var x = 0; x < aesthetic.tileObj.width; x++) {

                        //  Now we need to move down another y total rolls
                        sourcePixel = tilePixel + (y * aesthetic.tileObj.imgWidth);
                        //  and finally the last few pixels across
                        sourcePixel += x;

                        //  Now multiply the whole lot by 4 to take account of the packing in the image data
                        sourcePixel = sourcePixel * 4;

                        //  now check the top, left, right, bottom position of the x,y pixel in the tilemap
                        //  and update the values into the correct counter thingy!
                        try {
                            if (aesthetic.tileMap[x][y] !== null) {
                              counter[aesthetic.tileMap[x][y]].r += imageData.data[sourcePixel];
                              counter[aesthetic.tileMap[x][y]].g += imageData.data[sourcePixel+1];
                              counter[aesthetic.tileMap[x][y]].b += imageData.data[sourcePixel+2];
                              counter[aesthetic.tileMap[x][y]].count++;
                            }
                        } catch(er) {
                            console.log('Faield at: ' + x + ', ' + y);
                            console.log(aesthetic.tileMap);
                            return;
                        }
                    }
                }

                //  Ok, so now we've been thru all the pixels in the tile work out the average for the top, left, right, bottom quarters
                for (var q in qa) {
                    counter[qa[q]].r = parseInt(counter[qa[q]].r / counter[qa[q]].count, 10);
                    counter[qa[q]].g = parseInt(counter[qa[q]].g / counter[qa[q]].count, 10);
                    counter[qa[q]].b = parseInt(counter[qa[q]].b / counter[qa[q]].count, 10);
                }

                //  ok, now that we have the average values for the top, left, right and bottom. I want to know which pair have the greatest
                //  similarity
                var topleft = (Math.abs(counter.top.r-counter.left.r) + Math.abs(counter.top.g-counter.left.g) + Math.abs(counter.top.b-counter.left.b))/3;
                var topright = (Math.abs(counter.top.r-counter.right.r) + Math.abs(counter.top.g-counter.right.g) + Math.abs(counter.top.b-counter.right.b))/3;
                var bottomleft = (Math.abs(counter.bottom.r-counter.left.r) + Math.abs(counter.bottom.g-counter.left.g) + Math.abs(counter.bottom.b-counter.left.b))/3;
                var bottomright = (Math.abs(counter.bottom.r-counter.right.r) + Math.abs(counter.bottom.g-counter.right.g) + Math.abs(counter.bottom.b-counter.right.b))/3;

                var targetCorners = {
                    top: Math.floor(tileY * aesthetic.tileObj.imgHeight / aesthetic.tileObj.down),
                    bottom: Math.floor((tileY+1) * aesthetic.tileObj.imgHeight / aesthetic.tileObj.down) + 1,
                    left: Math.floor(tileX * aesthetic.tileObj.imgWidth / aesthetic.tileObj.across),
                    right: Math.floor((tileX+1) * aesthetic.tileObj.imgWidth / aesthetic.tileObj.across) + 1
                };

                if ((topleft < topright && topleft < bottomleft && topleft < bottomright) || (bottomright < topleft && bottomright < topright && bottomright < bottomleft)) {
                    var tl = { 'r': parseInt((counter.top.r + counter.left.r)/2, 10), 'g': parseInt((counter.top.g + counter.left.g)/2, 10), 'b': parseInt((counter.top.b + counter.left.b)/2, 10) };
                    var br = { 'r': parseInt((counter.bottom.r + counter.right.r)/2, 10), 'g': parseInt((counter.bottom.g + counter.right.g)/2, 10), 'b': parseInt((counter.bottom.b + counter.right.b)/2, 10) };

                    //  first one diagonal
                    //  NOTE: This probably looks odd, because normally a triangle has 3 points. But if we just
                    //  draw two triangles, the diagonals don't go flush and you have a tiny slither of gap between
                    //  them. So with the first one, we actually join the corners not from the very corner pixel
                    //  but the next pixel down (and across). The the second triangle we draw just with the normal
                    //  three points, with the diagonal *just* overlapping.
                    ctxt.fillStyle="rgb(" + tl.r + "," + tl.g + "," + tl.b + ")";
                    ctxt.beginPath();
                    ctxt.moveTo(targetCorners.left, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.top+1);
                    ctxt.lineTo(targetCorners.left+1, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.left, targetCorners.bottom);
                    ctxt.moveTo(targetCorners.left, targetCorners.top);
                    ctxt.closePath();
                    ctxt.fill();

                    ctxt.fillStyle="rgb(" + br.r + "," + br.g + "," + br.b + ")";
                    ctxt.beginPath();
                    ctxt.moveTo(targetCorners.right, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.left, targetCorners.bottom);
                    ctxt.moveTo(targetCorners.right, targetCorners.top);
                    ctxt.closePath();
                    ctxt.fill();

                } else {
                    var tr = { 'r': parseInt((counter.top.r + counter.right.r)/2, 10), 'g': parseInt((counter.top.g + counter.right.g)/2, 10), 'b': parseInt((counter.top.b + counter.right.b)/2, 10) };
                    var bl = { 'r': parseInt((counter.bottom.r + counter.left.r)/2, 10), 'g': parseInt((counter.bottom.g + counter.left.g)/2, 10), 'b': parseInt((counter.bottom.b + counter.left.b)/2, 10) };

                    ctxt.fillStyle="rgb(" + tr.r + "," + tr.g + "," + tr.b + ")";
                    ctxt.beginPath();
                    ctxt.moveTo(targetCorners.left, targetCorners.top+1);
                    ctxt.lineTo(targetCorners.left, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.right-1, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.left, targetCorners.top+1);
                    ctxt.closePath();
                    ctxt.fill();

                    ctxt.fillStyle="rgb(" + bl.r + "," + bl.g + "," + bl.b + ")";
                    ctxt.beginPath();
                    ctxt.moveTo(targetCorners.left, targetCorners.top);
                    ctxt.lineTo(targetCorners.right, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.left, targetCorners.bottom);
                    ctxt.lineTo(targetCorners.left, targetCorners.top);
                    ctxt.closePath();
                    ctxt.fill();
                }

            }
        }

        ct=$('#targetCanvas')[0];
        chrome.tabs.sendRequest(aesthetic.tab.id, {action: "swapImage", data: ct.toDataURL()});

        //  Destory everything, 'cause I'm like that!
        $('#sourceImage').remove();
        $('#sourceCanvas').remove();
        $('#targetCanvas').remove();
        $('#tileMap').remove();

    }

};

// Called when the url of a tab changes.
chrome.tabs.onUpdated.addListener(checkForValidUrl);
function checkForValidUrl (tabId, changeInfo, tab) {

    //    Check to see if we're likely to be on the flickr site
    try {
        if (tab.url.match(/flickr.com\/.*\/([0-9]+)/).length > 0) {
            // Now we need to check to see if a photo actually exists
            chrome.pageAction.show(tabId);
            aesthetic.tab = tab;
            chrome.tabs.sendRequest(aesthetic.tab.id, {action: "pageFocused"});
      }
    } catch(er) {
        // Ignore
    }
}

//  All the listening stuff
chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {

    //  if we have an action
    if ('action' in request) {

        if (request.action == 'imgUrl') {

            aesthetic.loadImage(request.imgUrl);

        }
    }

  }
);

chrome.pageAction.onClicked.addListener(function(tab) {
    
    chrome.tabs.sendRequest(aesthetic.tab.id, {action: "getImageUrl"});

});



