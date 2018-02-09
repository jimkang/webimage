/* global process */
var test = require('tape');
var Webimage = require('../index');
var assertNoError = require('assert-no-error');
require('longjohn');

process.on('unhandledRejection', reportUnhandledRejection);

Webimage(useWebimage);
// Uncomment to run tests in headful mode.
// Webimage({ headless: false }, useWebimage);

function useWebimage(error, webimage) {
  if (error) {
    throw error;
  }

  test('Handle a page crash without uncaught exceptions', crashTest);
  test('Shut down Webimage.', testShutdown);

  function crashTest(t) {
    webimage.getImage(
      {
        url: 'http://smidgeo.com/plan/',
        screenshotOpts: {
          clip: {
            x: 0,
            y: 0,
            width: 1280,
            height: 800
          },
          omitBackground: true
        },
        forceCrash: true
      },
      checkResult
    );

    function checkResult(error, buffer) {
      t.ok(error, 'Received error.');
      console.log(error);
      t.ok(!buffer, 'Did NOT receive a buffer.');
      t.end();
    }
  }

  function testShutdown(t) {
    webimage.shutDown(checkResult);

    function checkResult(error) {
      assertNoError(t.ok, error, 'No error while shutting down webimage.');
      t.end();
    }
  }
}

function reportUnhandledRejection(reason, promise) {
  console.log(reason.message);
  console.log(reason.stack);
  console.log(promise);
}
