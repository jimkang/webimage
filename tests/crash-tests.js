/* global process, __dirname */

var test = require('tape');
var Webimage = require('../index');
var fs = require('fs');
var assertNoError = require('assert-no-error');
require('longjohn');

process.on('unhandledRejection', reportUnhandledRejection);

Webimage(useWebimage);
// Uncomment to run tests in headful mode.
//Webimage({ headless: false }, useWebimage);

function useWebimage(error, webimage) {
  if (error) {
    throw error;
  }

  test('Handle a page crash without uncaught exceptions', crashTest);
  test('Handle unhandled error on page', t => errorTest(true, t));
  test('Ignore unhandled error on page', t => errorTest(false, t));
  test('Shut down Webimage.', testShutdown);

  function crashTest(t) {
    webimage.getImage(
      {
        url: 'chrome://crash',
        // waitLimit: 20000,
        screenshotOpts: {
          clip: {
            x: 0,
            y: 0,
            width: 1280,
            height: 10000
          },
          omitBackground: true
        }
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

  function errorTest(shouldStopOnPageError, t) {
    webimage.getImage(
      {
        html: '<html><body>Hey<script>throw new Error("Test")</script></body></html>;',
        stopOnPageError: shouldStopOnPageError,
        screenshotOpts: {
          clip: {
            x: 0,
            y: 0,
            width: 1280,
            height: 10000
          },
          omitBackground: true
        }
      },
      checkResult
    );

    function checkResult(error, buffer) {
      if (shouldStopOnPageError) {
        t.equal(error.message, 'Test', 'Received correct error.');
        t.ok(!buffer, 'Did NOT receive a buffer.');
      } else {
        t.ok(!error, 'Did NOT receive an error.');
        t.ok(buffer, 'Did receive a buffer.');
        if (buffer) {
          fs.writeFileSync(__dirname + '/output/page-error-result.png', buffer);
        }
      }
      t.end();
    }
  }
}

function reportUnhandledRejection(reason, promise) {
  console.log(reason.message);
  console.log(reason.stack);
  console.log(promise);
}
