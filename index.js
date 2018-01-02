var puppeteer = require('puppeteer');
var callNextTick = require('call-next-tick');

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

    function getImage({ html, screenshotOpts, viewportOpts }, done) {
      if (!browser) {
        callNextTick(
          done,
          new Error('Browser is closed. Cannot get a web image.')
        );
      } else {
        browser.newPage().then(onPage, done);
      }

      function onPage(page) {
        page.setContent(html).then(setViewport, done);

        function setViewport() {
          if (viewportOpts) {
            page.setViewport(viewportOpts).then(takeScreenshot, done);
          } else {
            callNextTick(takeScreenshot);
          }
        }

        function takeScreenshot() {
          page.screenshot(screenshotOpts).then(passBuffer, done);
        }

        function passBuffer(buffer) {
          done(null, buffer);
        }
      }
    }
  }
}

module.exports = Webimage;
