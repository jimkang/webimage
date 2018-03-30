var puppeteer = require('puppeteer');
var callNextTick = require('call-next-tick');
var Jimp = require('jimp');
var VError = require('verror');

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
      waitLimit = 2000
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
          getImageFromLoadedPage(conclude);
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

      function getImageFromLoadedPage(imageGetDone) {
        page.screenshot(screenshotOpts).then(callResize, imageGetDone);

        function callResize(buffer) {
          resizeIfNecessary(buffer, imageGetDone);
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
        console.log('webimage is giving up on waiting for page load!');
        page.removeListener('load', notifyLoaded);
        waitDone();
      }
    }

    // function waitForRightSize() {
    //   return page.waitForFunction(
    //     `window.innerWidth === ${viewportOpts.width} &&
    //     window.innerHeight === ${viewportOpts.height}`
    //   );
    // }

    function resizeIfNecessary(buffer, resizeDone) {
      if (supersampleOpts) {
        sizeDown();
      } else {
        callNextTick(resizeDone, null, buffer);
      }

      function sizeDown() {
        // debugger;
        Jimp.read(buffer, resize);

        function resize(error, image) {
          // console.log('Resizing.');
          if (error) {
            resizeDone(error);
          } else {
            image.resize(
              ~~(image.bitmap.width / 2),
              ~~(image.bitmap.height / 2),
              jimpModesForResizeModes[supersampleOpts.resizeMode]
            );
            image.getBuffer(
              mimeTypesForBufferTypes[supersampleOpts.desiredBufferType],
              resizeDone
            );
          }
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
  }
}

module.exports = Webimage;
