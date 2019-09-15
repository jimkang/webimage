/* global Buffer */
var callNextTick = require('call-next-tick');
//var palette = require('get-rgba-palette');
var omggif = require('omggif');
var indexImage = require('./index-image');

// TODO: Figure out how large that stuff actually is.
const gifHeaderFooterSize = 1000;
const requiredPaletteSize = 256;

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
  // Dividing by 4 here because there will be one index replacing the rgba values.
  const totalImagesSize =
    images.length *
    (firstImage.bitmap.data.length / 4 +
      gifHeaderFooterSize +
      requiredPaletteSize);
  var gifImage = new Buffer(totalImagesSize);
  var gifWriter = new omggif.GifWriter(
    gifImage,
    firstImage.bitmap.width,
    firstImage.bitmap.height,
    { loop: 0 }
  );
  images.forEach(addToGif);
  const gifBufferSize = gifWriter.end();
  callNextTick(done, null, gifImage.slice(0, gifBufferSize));

  function addToGif(image) {
    let { indexes, palette } = indexImage({ pixels: image.bitmap.data });
    if (palette.length > requiredPaletteSize) {
      console.error(
        'Warning: Need to truncate palette from',
        palette.length,
        'colors down to',
        requiredPaletteSize,
        '.'
      );
      palette.splice(requiredPaletteSize);
    }
    // Delay unit is hundredths of second.
    gifWriter.addFrame(0, 0, image.width, image.height, indexes, {
      palette,
      delay: frameLengthMS / 10
    });
  }
}

module.exports = rawImagesToAnimatedGif;
