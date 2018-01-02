/* global __dirname */

var test = require('tape');
var Webimage = require('../index');
var fs = require('fs');
var assertNoError = require('assert-no-error');
var rimraf = require('rimraf');

const outputDir = __dirname + '/output/';

rimraf.sync(outputDir + '*.png');

var testCases = [
  {
    name: 'Smidgeo sample',
    htmlFile: 'sample.html',
    screenshotOpts: {
      clip: {
        x: 0,
        y: 0,
        width: 500,
        height: 500
      },
      omitBackground: true
    },
    viewportOpts: {
      width: 320,
      height: 480,
      deviceScaleFactor: 1
    }
    // TODO: File diff.
  },
  {
    name: 'No opts',
    htmlFile: 'sample.html'
  }
];

Webimage(useWebimage);

function useWebimage(error, webimage) {
  if (error) {
    throw error;
  }

  testCases.forEach(runTest);
  test('Shut down Webimage.', testShutdown);

  function runTest(testCase) {
    test(testCase.name, webImageTest);

    function webImageTest(t) {
      var html = fs.readFileSync(__dirname + '/fixtures/' + testCase.htmlFile, {
        encoding: 'utf8'
      });
      webimage.getImage(
        {
          html,
          screenshotOpts: testCase.screenshotOpts,
          viewportOpts: testCase.viewportOpts
        },
        checkResult
      );

      function checkResult(error, buffer) {
        assertNoError(t.ok, error, 'No error while getting image.');
        t.ok(buffer.length > 0, 'buffer is not empty.');
        var filename = outputDir + testCase.name + '.png';
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
