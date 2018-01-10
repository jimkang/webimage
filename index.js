var puppeteer = require('puppeteer');
var callNextTick = require('call-next-tick');
var Jimp = require('jimp');
var sb = require('standard-bail')();

var mimeTypesForBufferTypes = {
  jpeg: Jimp.MIME_JPEG,
  png: Jimp.MIME_PNG,
  bmp: Jimp.MIME_BMP
};

var jimpModesForResizeModes = {
  nearestNeighbor: Jimp.RESIZE_NEAREST_NEIGHBOR,
  bilinear: Jimp.RESIZE_BILINEAR,
  bicubic: Jimp.RESIZE_BICUBIC,
  hermite: Jimp.RESIZE_HERMITE,
  bezier: Jimp.RESIZE_BEZIER
};

function Webimage(constructorDone) {
  puppeteer.launch().then(onBrowser, constructorDone);

  function onBrowser(theBrowser) {
    var browser = theBrowser;
    constructorDone(null, { getImage, shutDown });

    function shutDown(done) {
      browser.close().then(handleCloseError, handleCloseError);

      function handleCloseError(error) {
        browser = null;

        if (error) {
          done(error);
        } else {
          done();
        }
      }
    }

    function getImage(
      { html, url, screenshotOpts, viewportOpts, supersampleOpts },
      done
    ) {
      if (!browser) {
        callNextTick(
          done,
          new Error('Browser is closed. Cannot get a web image.')
        );
      } else {
        browser.newPage().then(onPage, handleRejection);
      }

      function onPage(page) {
        if (html) {
          page.setContent(html).then(setViewport, handleRejection);
        } else if (url) {
          page.goto(url).then(setViewport, handleRejection);
        } else {
          callNextTick(done, new Error('No html or url given to getImage.'));
        }

        function setViewport() {
          // We need to set the viewport's deviceScaleFactor if we are going to supersample.
          if (supersampleOpts) {
            if (viewportOpts) {
              if (viewportOpts.deviceScaleFactor) {
                viewportOpts.deviceScaleFactor *= 2;
              } else {
                viewportOpts.deviceScaleFactor = 2;
              }
            } else {
              viewportOpts = page.viewport();
              viewportOpts.deviceScaleFactor = 2;
            }
          }

          if (viewportOpts) {
            page
              .setViewport(viewportOpts)
              .then(takeScreenshot, handleRejection);
          } else {
            callNextTick(takeScreenshot);
          }
        }

        function takeScreenshot() {
          if (supersampleOpts) {
            page.screenshot(screenshotOpts).then(sizeDown, handleRejection);
          } else {
            page.screenshot(screenshotOpts).then(passBuffer, handleRejection);
          }
        }

        function sizeDown(buffer) {
          Jimp.read(buffer, resize);

          function resize(error, image) {
            if (error) {
              done(error);
            } else {
              image.resize(
                ~~(image.bitmap.width / 2),
                ~~(image.bitmap.height / 2),
                jimpModesForResizeModes[supersampleOpts.resizeMode]
              );
              image.getBuffer(
                mimeTypesForBufferTypes[supersampleOpts.desiredBufferType],
                sb(passBuffer, done)
              );
            }
          }
        }

        function passBuffer(buffer) {
          done(null, buffer);
        }
      }

      // Doing this instead of passing `done` directly to the reject param of the above promises to avoid
      // making them into reject handlers directly. If we do that, then if there is a problem in `done`, clients are
      // going to get a headscratcher UnhandledPromiseRejectionWarning.
      function handleRejection(error) {
        callNextTick(done, error);
      }
    }
  }
}

module.exports = Webimage;
