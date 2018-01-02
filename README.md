webimage
==================

Takes some html (with whatever you want embedded in it) and changes it into an image via headless Chrome. Callback-based convenience wrapper for [puppeteer](https://github.com/GoogleChrome/puppeteer).

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
          height: 480,
          deviceScaleFactor: 1
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
