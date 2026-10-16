Lector de códigos de barras (para "Escanear código de barras" en la hoja de añadir).
- barcode-detector-ponyfill.js: barcode-detector 3.0.8 (dist/iife/ponyfill.js), MIT, https://github.com/Sec-ant/barcode-detector
- zxing_reader.wasm: zxing-wasm 2.2.4 (dist/reader), MIT, https://github.com/Sec-ant/zxing-wasm
  Compilado de zxing-cpp (Apache-2.0, https://github.com/zxing-cpp/zxing-cpp).
Solo se cargan si el navegador no trae BarcodeDetector (iOS Safari), y solo al pulsar el botón.
