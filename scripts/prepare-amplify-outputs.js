const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const source = path.join(projectRoot, 'amplify_outputs.json');
const publicDirectory = path.join(projectRoot, 'public');
const destination = path.join(publicDirectory, 'amplify_outputs.json');

if (!fs.existsSync(source)) {
  console.error('No existe amplify_outputs.json. Ejecuta "npm run sandbox" o despliega el backend de Amplify.');
  process.exit(1);
}

fs.mkdirSync(publicDirectory, { recursive: true });
fs.copyFileSync(source, destination);
