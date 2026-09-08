# Diagnostics attribution

Circularity calculation, DualSense firmware/board/finish decoding, serial-query commands, and vibration/speaker test commands are adapted from [DualShock Calibration GUI](https://github.com/dualshock-tools/dualshock-tools.github.io), revision `fbbe58d55636ee9b81b71f9aaebba3fd8956a105`.

Reference files: `js/stick-renderer.js`, `js/controllers/ds5-controller.js`, `js/controllers/base-controller.js`, and `js/modals/quick-test/`.

Adaptations use DualSense Studio's shared WebHID output queue and Bluetooth framing, bounded test durations, cancellation on focus loss and close, full-sweep coverage before circularity scoring, and explicit distinction between observed inputs and user-confirmed effects. Finish colors are approximate visual previews. Serial numbers are discarded after finish lookup. No calibration, NVS unlock/lock, or persistent-save commands are included.

The original MIT notice follows in full:

MIT License

Copyright (c) 2024 the_al

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
