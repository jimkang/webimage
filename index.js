var puppeteer = require('puppeteer');
var callNextTick = require('call-next-tick');
var Jimp = require('jimp');

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

  function onDisconnect() {
    if (!shuttingDown) {
      throw new Error('Got disconnected from the browser!');
    }
    // startBrowser();
  }

  function onBrowser(theBrowser) {
    browser = theBrowser;
    browser.on('disconnected', onDisconnect);
    constructorDone(null, {
      getImage,
      shutDown
    });
  }

  function onPageCrash(error) {
    // For now, just give up on everything.
    console.log('webimage caught page crash!', error, error.stack);
    throw error;
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
    done
  ) {
    var page;
    var screenshotBuffer;
    // console.log('Started getImage.');
    if (!browser) {
      callNextTick(
        done,
        new Error('Browser is closed. Cannot get a web image.')
      );
    } else {
      browser.newPage().then(onPage, handleRejection);
    }

    function onPage(thePage) {
      page = thePage;

      if (html || url) {
        page.on('error', onPageCrash);
        setViewport(viewportOpts, supersampleOpts)
          .then(loadContent, handleRejection)
          .then(waitForLoadCompletion, handleRejection)
          .then(takeScreenshot, handleRejection)
          .then(resizeIfNecessary, handleRejection)
          .then(saveBuffer, handleRejection)
          .then(removeCrashListener, handleRejection)
          .then(closePageThenable)
          .then(clearPageRef, handleRejection)
          .then(passBuffer, handleRejection);
      } else {
        callNextTick(done, new Error('No html or url given to getImage.'));
      }
    }

    function removeCrashListener() {
      // console.log('Removing crash listener.');
      page.removeListener('error', onPageCrash);
    }

    function clearPageRef() {
      // console.log('Clearing page ref.');
      page = null;
    }

    function closePageThenable(resolve, reject) {
      return page.close(resolve, reject);
    }

    // function handlePageCloseError(error) {
    //   console.log('Could not close page:', error);
    // }

    function loadContent() {
      if (html) {
        return page.setContent(html);
      } else {
        return page.goto(url);
      }
    }

    function waitForLoadCompletion() {
      // console.log('Waiting for page to load.');
      return new Promise(loadCompletionThenable);

      function loadCompletionThenable(resolve /*, reject*/) {
        // console.log('resolve', resolve);
        page.once('load', notifyLoaded);

        var timeoutId = setTimeout(quitWaiting, waitLimit);

        function notifyLoaded() {
          clearTimeout(timeoutId);
          resolve();
        }

        function quitWaiting() {
          console.log('webimage is giving up on waiting for page load!');
          page.removeListener('load', resolve);
          // TODO: reject instead of trying to take a shot anyway?
          resolve();
        }
      }
    }

    // function waitForRightSize() {
    //   return page.waitForFunction(
    //     `window.innerWidth === ${viewportOpts.width} &&
    //     window.innerHeight === ${viewportOpts.height}`
    //   );
    // }

    function takeScreenshot() {
      return page.screenshot(screenshotOpts);
    }

    function resizeIfNecessary(buffer) {
      if (supersampleOpts) {
        return new Promise(sizeDown);
      } else {
        return Promise.resolve(buffer);
      }

      function sizeDown(resolve, reject) {
        // debugger;
        Jimp.read(buffer, resize);

        function resize(error, image) {
          // console.log('Resizing.');
          if (error) {
            reject(error);
          } else {
            image.resize(
              ~~(image.bitmap.width / 2),
              ~~(image.bitmap.height / 2),
              jimpModesForResizeModes[supersampleOpts.resizeMode]
            );
            image.getBuffer(
              mimeTypesForBufferTypes[supersampleOpts.desiredBufferType],
              getBufferDone
            );
          }

          function getBufferDone(error, resizedBuffer) {
            // debugger;
            if (error) {
              reject(error);
            } else {
              resolve(resizedBuffer);
            }
          }
        }
      }
    }

    function saveBuffer(buffer) {
      // console.log('Got the screenshot!', buffer.length);
      screenshotBuffer = buffer;
    }

    function passBuffer() {
      // console.log('Passing buffer', screenshotBuffer.length);
      done(null, screenshotBuffer);
    }

    // Doing this instead of passing `done` directly to the reject param of the above promises to avoid
    // making them into reject handlers directly. If we do that, then if there is a problem in `done`, clients are
    // going to get a headscratcher UnhandledPromiseRejectionWarning.
    function handleRejection(error) {
      // console.log('Rejection!')
      callNextTick(done, error);
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
  }
}

module.exports = Webimage;
