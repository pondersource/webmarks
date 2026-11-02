'use strict';

// Current browsers support native class accessors. Target them consistently in
// tests and production, without the retired IE 11 Babel transform pipeline.
module.exports = {
  browsers: [
    'last 1 Chrome versions',
    'last 1 Firefox versions',
    'last 1 Safari versions'
  ]
};
