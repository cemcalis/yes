const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'frontend', '.next'),
  path.join(__dirname, '..', 'backend')
];
const FILE_EXT = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && FILE_EXT.includes(path.extname(ent.name))) processFile(full);
  }
}

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const re = /from\s+((?:\.\.?\/[^\s'";,)]+))/g;
  let m;
  let found = false;
  while ((m = re.exec(src)) !== null) {
    console.log(`${path.relative(process.cwd(), file)}:${m.index} -> from ${m[1]}`);
    found = true;
  }
  return found;
}

let total = 0;
for (const t of targets) {
  walk(t);
}
console.log('Done scanning.');
