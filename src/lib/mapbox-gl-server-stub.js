/**
 * Webpack resolves `mapbox-gl` to this file on the **server** bundle only.
 * Prevents Node from executing the real mapbox-gl entry (browser/WebGL) during SSR.
 */
module.exports = {};
