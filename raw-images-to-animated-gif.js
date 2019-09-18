/* global Buffer */

var callNextTick = require('call-next-tick');
var { GIFEncoder } = require('gif.js');

// Assumes images are all the same size. images should be Jimp image instances.
function rawImagesToAnimatedGif({ images, frameLengthMS = 1000 / 30 }, done) {
  if (images.length < 1) {
    callNextTick(
      done,
      new Error('No images passed to makeAnimatedGifFromImages.')
    );
    return;
  }
  var firstImage = images[0];

  var encoder = new GIFEncoder(
    firstImage.bitmap.width,
    firstImage.bitmap.height
  );

  encoder.writeHeader();
  images.forEach(addToGif);
  encoder.finish();

  var pages = encoder.stream().pages;
  var buffer = Buffer.concat(pages);

  callNextTick(done, null, buffer);

  function addToGif(image) {
    encoder.setRepeat(0);
    encoder.setDelay(frameLengthMS / 10);
    encoder.addFrame(image.bitmap.data);
  }
}

module.exports = rawImagesToAnimatedGif;
