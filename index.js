/* global process */

var puppeteer = require('puppeteer');
var callNextTick = require('call-next-tick');
var Jimp = require('jimp');
var VError = require('verror');
var queue = require('d3-queue').queue;
var rawImagesToAnimatedGif = require('./raw-images-to-animated-gif');

const nsInMS = 1e9 / 1000;

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

function Webimage(launchOptsOrConstructorDone, possibleConstructorDone) {
  var constructorDone = possibleConstructorDone;
  var launchOpts;
  var browser;
  var shuttingDown = false;

  if (typeof launchOptsOrConstructorDone === 'function') {
    constructorDone = launchOptsOrConstructorDone;
  } else if (
    launchOptsOrConstructorDone &&
    typeof launchOptsOrConstructorDone === 'object'
  ) {
    launchOpts = launchOptsOrConstructorDone;
  }

  startBrowser();

  function startBrowser() {
    puppeteer
      .launch(launchOpts)
      .then(onBrowser, handleRejectionDuringConstruction);
  }

  // Doing this instead of passing `constructorDone` directly to the reject param of the above promises to avoid
  // making them into reject handlers directly. If we do that, then if there is a problem in `done`, clients are
  // going to get a headscratcher UnhandledPromiseRejectionWarning.
  function handleRejectionDuringConstruction(error) {
    callNextTick(constructorDone, error);
  }

  function onBrowser(theBrowser) {
    browser = theBrowser;
    constructorDone(null, {
      getImage,
      shutDown
    });
  }

  function shutDown(done) {
    shuttingDown = true;
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
    {
      html,
      url,
      screenshotOpts,
      viewportOpts,
      supersampleOpts,
      waitLimit = 2000,
      autocrop,
      burstCount = 1,
      timeBetweenBursts = 1000 / 30,
      debug = false,
      makeBurstsIntoAnimatedGif = false
    },
    getImageDone
  ) {
    var concluded = false;
    browser.on('disconnected', onDisconnect);

    var page;

    // console.log('Started getImage.');
    if (!browser) {
      conclude(new Error('Browser is closed. Cannot get a web image.'));
    } else {
      browser.newPage().then(onPage, handleRejection);
    }

    function onPage(thePage) {
      page = thePage;
      page.on('error', conclude);

      if (html || url) {
        loadPage(evaluatePageLoad);
      } else {
        conclude(new Error('No html or url given to getImage.'));
      }

      function evaluatePageLoad(error) {
        if (error) {
          conclude(error);
        } else {
          getImagesFromLoadedPage(conclude);
        }
      }

      function loadPage(loadDone) {
        var needToCallDone = true;

        setViewport(viewportOpts, supersampleOpts)
          .then(loadContent, handleRejection)
          .then(callWaitForLoadCompletion, handleRejection);

        function callWaitForLoadCompletion() {
          waitForLoadCompletion(loadSuccess);
        }

        function loadSuccess() {
          if (needToCallDone) {
            needToCallDone = false;
            loadDone();
          }
        }
      }

      function getImagesFromLoadedPage(imagesGotDone) {
        var images = [];
        var timeOfLastScreenshot;

        callGetImage();

        function proceedWithImage(error, image) {
          if (error) {
            imagesGotDone(error);
            return;
          }

          images.push(image);

          //console.log('buffers', buffers.length, 'burstCount', burstCount);
          if (images.length < burstCount) {
            let delayUntilNextImage = timeBetweenBursts;
            const now = process.hrtime();
            if (timeOfLastScreenshot) {
              // Not accounted for: The time it actually takes
              // to take the screenshot once the API call is
              // made.
              delayUntilNextImage -= convertDiffToMS(
                process.hrtime(timeOfLastScreenshot)
              );
            }
            timeOfLastScreenshot = now;
            setTimeout(callGetImage, delayUntilNextImage);
          } else {
            if (images.length === 1) {
              // Pass back a single buffer.
              encodeImage(images[0], imagesGotDone);
            } else {
              if (makeBurstsIntoAnimatedGif) {
                rawImagesToAnimatedGif(
                  { images, frameLengthMS: timeBetweenBursts },
                  imagesGotDone
                );
              } else {
                // Pass back an array of buffers.
                let q = queue();
                for (let i = 0; i < images.length; ++i) {
                  q.defer(encodeImage, images[i]);
                }
                q.awaitAll(imagesGotDone);
              }
            }
          }
        }

        function callGetImage() {
          getImageFromLoadedPage(proceedWithImage);
        }
      }

      // Possible optimization: Do resizes in parallel with screenshotting.
      function getImageFromLoadedPage(imageGetDone) {
        if (page) {
          page.screenshot(screenshotOpts).then(callOps, imageGetDone);
        } else {
          callNextTick(
            imageGetDone,
            new Error('page cleared before screenshot could be taken.')
          );
        }

        function callOps(buffer) {
          runJimpOps(buffer, imageGetDone);
        }
      }
    }

    function clearPageRef() {
      // console.log('Clearing page ref.');
      page = null;
    }

    // function handlePageCloseError(error) {
    //   console.log('Could not close page:', error);
    // }

    function loadContent() {
      if (html) {
        return page.setContent(html);
      } else {
        return page.goto(url, { waitUntil: 'networkidle0' });
      }
    }

    function waitForLoadCompletion(waitDone) {
      page.once('load', notifyLoaded);
      var timeoutId = setTimeout(quitWaiting, waitLimit);

      function notifyLoaded() {
        clearTimeout(timeoutId);
        waitDone();
      }

      function quitWaiting() {
        if (debug) {
          console.error('webimage is giving up on waiting for page load!');
        }
        if (page) {
          page.removeListener('load', notifyLoaded);
        }
        waitDone();
      }
    }

    // function waitForRightSize() {
    //   return page.waitForFunction(
    //     `window.innerWidth === ${viewportOpts.width} &&
    //     window.innerHeight === ${viewportOpts.height}`
    //   );
    // }

    function runJimpOps(buffer, opsDone) {
      Jimp.read(buffer, operate);

      function operate(error, image) {
        if (error) {
          opsDone(error);
        } else {
          if (supersampleOpts) {
            image.resize(
              ~~(image.bitmap.width / 2),
              ~~(image.bitmap.height / 2),
              jimpModesForResizeModes[supersampleOpts.resizeMode]
            );
          }
          if (autocrop) {
            image.autocrop(autocrop);
          }
          opsDone(null, image);
        }
      }
    }

    // Doing this instead of passing `done` directly to the reject param of the above promises to avoid
    // making them into reject handlers directly. If we do that, then if there is a problem in `done`, clients are
    // going to get a headscratcher UnhandledPromiseRejectionWarning.
    function handleRejection(error) {
      // console.log('Rejection!')
      conclude(error);
    }

    function setViewport(viewportOpts, supersampleOpts) {
      var hasValidViewportOpts =
        viewportOpts &&
        !isNaN(viewportOpts.width) &&
        !isNaN(viewportOpts.height);

      // We need to set the viewport's deviceScaleFactor if we are going to supersample.
      if (supersampleOpts) {
        if (hasValidViewportOpts) {
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

      if (hasValidViewportOpts) {
        return page.setViewport(viewportOpts);
      } else {
        return Promise.resolve();
      }
    }

    function onDisconnect() {
      if (!shuttingDown) {
        conclude(new Error('Got disconnected from the browser!'));
      }
      // startBrowser();
    }

    function conclude(error, buffer) {
      if (!concluded) {
        concluded = true;
        browser.removeListener('disconnected', onDisconnect);

        cleanUpPage(callDone);
      }

      function callDone(cleanUpError) {
        var finalError = error;
        if (cleanUpError) {
          finalError = new VError.MultiError(error, cleanUpError);
        }
        getImageDone(finalError, buffer);
      }
    }

    function cleanUpPage(cleanUpDone) {
      if (page) {
        //console.log('Removing handler');
        page.removeListener('error', conclude);

        page
          .close()
          .then(clearPageRef, cleanUpDone)
          // close() passes nothing on success, so it's safe to pass cleanUpDone
          // as the success handler.
          .then(cleanUpDone, cleanUpDone);
      }
    }

    function encodeImage(image, done) {
      let mimeType = Jimp.MIME_PNG;
      if (supersampleOpts && supersampleOpts.desiredBufferType) {
        mimeType = mimeTypesForBufferTypes[supersampleOpts.desiredBufferType];
      }
      image.getBuffer(mimeType, done);
    }
  }
}

function convertDiffToMS(hrDiff) {
  return hrDiff[0] * 1000 + hrDiff[1] / nsInMS;
}

module.exports = Webimage;
