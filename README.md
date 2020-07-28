webimage
==================

![Node.js CI](https://github.com/jimkang/webimage/workflows/Node.js%20CI/badge.svg)

Takes some html (with whatever you want embedded in it) and changes it into an image via headless webkit. Callback-based convenience wrapper for [playwright](https://github.com/microsoft/playwright). Also accepts urls.

Installation
------------

    npm install webimage

Usage
-----

    var Webimage = require('webimage');
    var fs = require('fs');

    const html = `<html>
      <head>
        <title>Sample</title>
        <style>
          body {
            font-family: futura;
            font-size: 48px;
          }

          .header {
            background-color: black;
            color: white;
          }
          .container {
            width: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            Here is some sample text!
          </div>
          <img src="http://smidgeo.com/images/smidgeo_headshot.jpg" />
        </div>
      </body>
      </html>
    `;

    Webimage(useWebimage);

    function useWebimage(error, webimage) {
      if (error) {
        logError(error);
        return;
      }

      webImage({
        html,
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
          height: 480
        },
        supersampleOpts: {
          finalBufferType: 'jpeg',
          resizeMode: 'bezier'
          // resizeMode can be:
          // 'nearestNeighbor'
          // 'bilinear'
          // 'bicubic'
          // 'hermite'
          // 'bezier'
        },
        autocrop: {
          // Provide an object here to autocrop (crop out sections adjacent to the edges that are the same color as the edges).
          // These options correspond to Jimp autocrop: https://github.com/oliver-moran/jimp/tree/master/packages/plugin-crop#autocrop

        }
      },
      useImage);

      function useImage(error, imageBuffer) {
        if (error) {
          logError(error);
        }
        else {
          fs.writeFileSync(__dirname + '/images/web-image.png', imageBuffer);
        }
      }
    }

Result:

![smidgeo sample](https://user-images.githubusercontent.com/324298/34311923-912e0406-e72e-11e7-8d76-437f52e03476.png)

If you want to use a url instead of html, specify a `url` opt when calling webimage.

If you want to provide puppeteer.launch opts, pass it as the first parameter to the constructor and a callback to receive the instance as the second parameter.

If you'd like to take a burst of screenshots, pass these params to `getImage`:

- `burstCount`: the number of screenshots you want to take.
- `timeBetweenBursts` is the number of milliseconds that should pass between screenshots. For example, `1000/30` for 30 fps. (The timing is not perfect, though. This module does not actually know how long the Puppeteer API will actually take to take the screenshot; assumes 0.)

When you specify the burst params, the value passed to the callback is an array of buffers instead of a single buffer.

If you'd like to produce a single animated gif from the bursts instead of several pngs, also specify the param:

- `makeBurstsIntoAnimatedGif: true`. This is currently slightly wonky, though; it produces gifs that are viewable in Firefox and Chrome, but Gimp says they're invalid.

## A note on Chromium vs. Webkit

This is far from scientific, but anecdotally, they seem about the same in terms of speed. Here's some measured test run times from a couple runs of `webimage-tests.js` on an Ubuntu laptop.

| Test name      | Chromium            | Webkit              |
|----------------|---------------------|---------------------|
| Smidgeo sample | 2.393453813 seconds | 2.506748401 seconds |
| Large viewport | 2.490697264 seconds | 2.576515146 seconds |
| No opts        | 2.624029675 seconds | 2.665525446 seconds |
| Supersample    | 3.946490793 seconds | 3.807545900 seconds |
| URL shot       | 4.173368954 seconds | 3.815081776 seconds |
| Crop           | 2.679637398 seconds | 2.680670817 seconds |

I don't think taking screenshots works at all in headless Firefox as of 2020-07-03.

Tests
-----

Run tests with `make test`.

License
-------

The MIT License (MIT)

Copyright (c) 2017 Jim Kang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
