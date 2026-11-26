# image-manipulators
Code hangout for MeltMixPix https://sites.google.com/view/meltmixpix

## Shared image shelf

The **⇄ Shelf** button opens the image shelf shared by all apps on [snicker02.github.io](https://snicker02.github.io/#shelf). It stores images in this browser only (IndexedDB), and every app on the site can read the same shelf.

- **Save current** puts the current view on the shelf.
- **Send to ↗** opens another app in a new tab with the image already loaded.
- **Load here** brings a shelf image into this app as the source image, the same as Choose an image. Opening the app with `?shelf=<id>` does the same on start, which is how Send to works.

The shelf code lives in [`snicker02.github.io/shared/bridge.js`](https://github.com/snicker02/snicker02.github.io/blob/main/shared/bridge.js). If it can't load (for example when you're offline), the app works as before and the button is hidden.
