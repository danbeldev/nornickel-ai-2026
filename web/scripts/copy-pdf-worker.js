const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(
  __dirname,
  '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
);
const publicDirectory = path.resolve(__dirname, '../public');
const destination = path.join(publicDirectory, 'pdf.worker.min.mjs');

fs.mkdirSync(publicDirectory, { recursive: true });
fs.copyFileSync(source, destination);
