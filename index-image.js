// Inspired by: https://github.com/jhogervorst/indexed-colour-image

var range = require('d3-array').range;

function indexImage({ pixels, colorsPerChannel = 8 }) {
  var divider = Math.round(255 / colorsPerChannel);
  // I think an index of 0 is ignored in the gif format?
  // So, don't assign an actual color to this index in the palette.
  var palette = [0];
  var indexes = [];

  for (var i = 0; i < pixels.length; i += 4) {
    const r = Math.round(pixels[i] / divider) * divider;
    const g = Math.round(pixels[i + 1] / divider) * divider;
    const b = Math.round(pixels[i + 2] / divider) * divider;
    const quantizedRGB = r * 0x10000 + g * 0x100 + b;

    let index = palette.indexOf(quantizedRGB);
    if (index === -1) {
      index = palette.length;
      palette.push(quantizedRGB);
    }
    indexes.push(index);
  }

  // Pad palette so that its length is a power of 2.
  const nextPowerOf2 = Math.ceil(Math.log2(palette.length));
  var padding = range(Math.pow(2, nextPowerOf2) - palette.length).map(() => 0);
  return { indexes, palette: palette.concat(padding) };
}

module.exports = indexImage;
