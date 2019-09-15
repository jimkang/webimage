/* global __dirname, process */

var test = require('tape');
var rawImagesToAnimatedGif = require('../raw-images-to-animated-gif');
var fs = require('fs');
var assertNoError = require('assert-no-error');
var Jimp = require('jimp');
var queue = require('d3-queue').queue;
require('longjohn');

const frameDir = __dirname + '/fixtures/gif-frames';
const outputDir = __dirname + '/output';
const outFile = outputDir + '/' + 'animated.gif';

if (fs.existsSync(outFile)) {
  fs.unlinkSync(outFile);
}

process.on('unhandledRejection', reportUnhandledRejection);

test('Convert raw image buffers to animated gif', rawToAnimatedGifTest);

function rawToAnimatedGifTest(t) {
  var safeRead = Jimp.read.bind(Jimp);
  var q = queue();
  var frameFiles = fs
    .readdirSync(frameDir)
    .filter(s => s.endsWith('.png'))
    .map(s => frameDir + '/' + s);
  frameFiles.forEach(queueLoadFrame);
  q.awaitAll(runConversion);

  function queueLoadFrame(frameFile) {
    q.defer(safeRead, frameFile);
  }

  function runConversion(error, images) {
    assertNoError(t.ok, error, 'No error while loading frame images.');
    rawImagesToAnimatedGif(images, checkResult);
  }

  function checkResult(error, buffer) {
    t.ok(buffer.length > 0, 'buffer is not empty.');
    fs.writeFileSync(outFile, buffer);
    console.log('Look at', outFile, 'and make sure it is an animated gif.');
    t.end();
  }
}

function reportUnhandledRejection(reason, promise) {
  console.log(reason.message);
  console.log(reason.stack);
  console.log(promise);
}
