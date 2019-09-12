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
    name: 'URL burst',
    url: 'https://jimkang.com/spinners/#seed=2019-09-12T01%3A10%3A42.704Z',
    waitLimit: 3000,
    burstCount: 30,
    timeBetweenBursts: 1000 / 30,
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
      var html;
      if (testCase.htmlFile) {
        html = fs.readFileSync(__dirname + '/fixtures/' + testCase.htmlFile, {
          encoding: 'utf8'
        });
      }
      webimage.getImage(
        {
          html,
          url: testCase.url,
          screenshotOpts: testCase.screenshotOpts,
          viewportOpts: testCase.viewportOpts,
          supersampleOpts: testCase.supersampleOpts,
          autocrop: testCase.autocrop,
          burstCount: testCase.burstCount,
          timeBetweenBursts: testCase.timeBetweenBursts,
          debug: true
        },
        checkResult
      );

      function checkResult(error, buffers) {
        assertNoError(t.ok, error, 'No error while getting image.');
        t.ok(Array.isArray(buffers), 'buffers is an array.');
        if (Array.isArray(buffers)) {
          buffers.forEach(checkBuffer);
        }
        t.end();
      }

      function checkBuffer(buffer, i) {
        t.ok(buffer.length > 0, 'buffer is not empty.');
        var ext = 'png';
        if (
          testCase.supersampleOpts &&
          testCase.supersampleOpts.desiredBufferType === 'jpeg'
        ) {
          ext = 'jpg';
        }
        var filename = `${outputDir}/${testCase.name}-${i}.${ext}`;
        fs.writeFileSync(filename, buffer);
        console.log(
          'Look at',
          filename,
          'and make sure it is good and the contents are the SIZE they *should* be.'
        );
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
