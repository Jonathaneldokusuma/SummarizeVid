const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const startMarker = '<script type="module">';
const start = html.indexOf(startMarker);
const end = html.indexOf('</script>', start);

if (start < 0 || end < 0) {
  throw new Error('Could not find the main module script in index.html.');
}

const moduleSource = html.slice(start + startMarker.length, end);
const importStub = 'const pipeline = async () => async () => ({ text: "" }); const env = {};';
const checkSource = moduleSource.replace(
  /^\s*import\s+\{\s*pipeline,\s*env\s*\}\s+from\s+['"]https:\/\/cdn\.jsdelivr\.net\/npm\/@xenova\/transformers@2\.17\.2['"];\s*$/m,
  importStub
);

if (checkSource.includes('import { pipeline, env }')) {
  throw new Error('Could not replace the Transformers.js CDN import before syntax checking.');
}

new Function(checkSource);
console.log('index.html module script syntax ok');
