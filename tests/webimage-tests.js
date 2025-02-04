/* global __dirname, process */

var test = require('tape');
var Webimage = require('../index');
var fs = require('fs');
var assertNoError = require('assert-no-error');
var rimraf = require('rimraf');
require('longjohn');

const outputDir = __dirname + '/output/';

rimraf.sync(outputDir + '*.png');

process.on('unhandledRejection', reportUnhandledRejection);

var testCases = [
  {
    name: 'waitForFunction',
    url: 'https://smidgeo.com',
    waitForFunctionOpts: {
      pageFunction(selector) {
        var selectorSuccess = !!document.querySelector(selector);
        // var el = document.querySelector('.chart');
        var el = document.querySelector('.third');
        // el.innerHTML = '<circle r="200" cx="200" cy="200"></circle>';
        el.innerHTML = 'Hay';
        return selectorSuccess;
      },
      arg: 'body > * > * > * > *',
      options: {
        polling: 500,
        timeout: 5000
      }
    }
  },
  {
    // After this test runs, you need to check the screenshot to make sure "This text should not be in the screenshot" is not in it.
    name: 'waitForPageEvent',
    htmlFile: 'event.html',
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 720
      },
    },
    waitForPageEvent: 'secondEvent'
  },
  {
    name: 'Smidgeo sample',
    htmlFile: 'sample.html',
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 320,
        height: 480
      },
      omitBackground: true
    },
    viewportOpts: {
      width: 320,
      height: 480
    }
    // TODO: File diff.
  },
  {
    name: 'Large viewport',
    htmlFile: 'sample.html',
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 720
      },
      omitBackground: true
    },
    viewportOpts: {
      width: 1280,
      height: 720
    }
    // TODO: File diff.
  },
  {
    name: 'No opts',
    htmlFile: 'skew.html'
  },
  {
    name: 'Supersample',
    htmlFile: 'skew.html',
    supersampleOpts: {
      desiredBufferType: 'jpeg',
      resizeMode: 'bezier'
    }
  },
  {
    name: 'URL shot',
    url: 'https://apod.nasa.gov/apod/astropix.html',
    waitLimit: 10000,
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 800
      },
      omitBackground: true
    }
    // TODO: File diff.
  },
  {
    name: 'Crop',
    htmlFile: 'skew.html',
    autocrop: {
      cropOnlyFrames: false
    }
  }
];

Webimage(useWebimage);
// Uncomment to run tests in headful mode.
// Webimage({ headless: false }, useWebimage);

function useWebimage(error, webimage) {
  if (error) {
    throw error;
  }

  testCases.forEach(runTest);
  test('Shut down Webimage.', testShutdown);

  function runTest(testCase) {
    test(testCase.name, webImageTest);

    function webImageTest(t) {
      var html;
      if (testCase.htmlFile) {
        html = fs.readFileSync(__dirname + '/fixtures/' + testCase.htmlFile, {
          encoding: 'utf8'
        });
      }

      const start = process.hrtime();
      webimage.getImage(
        {
          html,
          url: testCase.url,
          screenshotOpts: testCase.screenshotOpts,
          viewportOpts: testCase.viewportOpts,
          supersampleOpts: testCase.supersampleOpts,
          autocrop: testCase.autocrop,
          waitForFunctionOpts: testCase.waitForFunctionOpts,
          waitForPageEvent: testCase.waitForPageEvent
        },
        checkResult
      );

      function checkResult(error, buffer) {
        const elapsed = process.hrtime(start);
        console.log(
          'Test took',
          elapsed[0],
          'seconds and',
          elapsed[1],
          'nanoseconds.'
        );
        assertNoError(t.ok, error, 'No error while getting image.');
        t.ok(buffer && buffer.length > 0, 'buffer is not empty.');
        var ext = '.png';
        if (
          testCase.supersampleOpts &&
          testCase.supersampleOpts.desiredBufferType === 'jpeg'
        ) {
          ext = '.jpg';
        }
        var filename = outputDir + testCase.name + ext;
        fs.writeFileSync(filename, buffer);
        console.log(
          'Look at',
          filename,
          'and make sure it is good and the contents are the SIZE they *should* be.'
        );
        t.end();
      }
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
