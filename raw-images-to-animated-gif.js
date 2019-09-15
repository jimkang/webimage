/* global Buffer */
var callNextTick = require('call-next-tick');
//var palette = require('get-rgba-palette');
var omggif = require('omggif');
var indexImage = require('./index-image');

// Assumes images are all the same size. images should be Jimp image instances.
function rawImagesToAnimatedGif(images, done) {
  if (images.length < 1) {
    callNextTick(
      done,
      new Error('No images passed to makeAnimatedGifFromImages.')
    );
    return;
  }
  var firstImage = images[0];
  const totalImagesSize = images.length * firstImage.bitmap.data.length;
  var gifImage = new Buffer(totalImagesSize);
  var gifWriter = new omggif.GifWriter(
    gifImage,
    firstImage.bitmap.width,
    firstImage.bitmap.height,
    { loop: 0 }
  );
  images.forEach(addToGif);
  const gifBufferSize = gifWriter.end();
  console.log('gifBufferSize', gifBufferSize);
  callNextTick(done, null, gifImage.slice(0, gifBufferSize));

  function addToGif(image) {
    let { indexes, palette } = indexImage({ pixels: image.bitmap.data });
    gifWriter.addFrame(0, 0, image.width, image.height, indexes, { palette });
  }
}

module.exports = rawImagesToAnimatedGif;
