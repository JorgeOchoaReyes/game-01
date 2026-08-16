vendor/ — third-party libraries live here.

Ember uses NO third-party libraries. The entire game is vanilla JavaScript on
the HTML5 Canvas 2D API, all art is drawn procedurally, and every sound effect
is synthesized at runtime with the Web Audio API. There is therefore nothing to
vendor, and the game makes zero external network requests.

This folder is kept (per the packaging spec) to make that explicit.
