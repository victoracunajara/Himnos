const fs = require('fs');
const path = require('path');

const hymnsDir = path.join(__dirname, '../data/himnos');
const outputFile = path.join(__dirname, '../data/himnos.json');

const files = fs
  .readdirSync(hymnsDir)
  .filter(file => file.endsWith('.json'))
  .sort();

const hymns = files.map(file => {
  const fullPath = path.join(hymnsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  return JSON.parse(content);
});

fs.writeFileSync(
  outputFile,
  JSON.stringify(hymns, null, 2) + '\n'
);

console.log(`Generados ${hymns.length} himnos en data/himnos.json`);
