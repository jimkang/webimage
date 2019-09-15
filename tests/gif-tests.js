/* global __dirname, process */

var test = require('tape');
var Webimage = require('../index');
var fs = require('fs');
var assertNoError = require('assert-no-error');
var rimraf = require('rimraf');
require('longjohn');

const outputDir = __dirname + '/output';

rimraf.sync(outputDir + '*.png');

process.on('unhandledRejection', reportUnhandledRejection);

var testCases = [
  {
    name: 'Animated gif from URL',
    url: 'https://jimkang.com/spinners/#seed=2019-09-12T01%3A10%3A42.704Z',
    waitLimit: 3000,
    burstCount: 30,
    timeBetweenBursts: 1000 / 30,
    makeBurstsIntoAnimatedGif: true,
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 800
      },
      omitBackground: true
    }
  }
];

Webimage(useWebimage);
// Uncomment to run tests in headful mode.
//Webimage({ headless: false }, useWebimage);

function useWebimage(error, webimage) {
  if (error) {
    throw error;
  }

  testCases.forEach(runTest);
  test('Shut down Webimage.', testShutdown);

  function runTest(testCase) {
    test(testCase.name, webImageTest);

    function webImageTest(t) {
      webimage.getImage(Object.assign({ debug: true }, testCase), checkResult);

      function checkResult(error, buffer) {
        t.ok(buffer.length > 0, 'buffer is not empty.');
        const ext = 'gif';
        const filename = `${outputDir}/${testCase.name}.${ext}`;
        fs.writeFileSync(filename, buffer);
        console.log('Look at', filename, 'and make sure it is good.');
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
