vendor/ — third-party libraries live here.

Ember (3D) uses ONE third-party library:

  three.min.js — Three.js r128 (MIT licence), the WebGL renderer used to draw the
                 campfire, its dynamic light and shadows, the low-poly world and
                 the survivor. Loaded from index.html by a relative <script src>.

Everything else is original: all models are built procedurally in code, and every
sound effect is synthesized at runtime with the Web Audio API. The game makes zero
external network requests and runs fully offline.
