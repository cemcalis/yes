const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXCLUDE = ['node_modules', '.next', 'dist', 'build', 'public', 'data', 'logs'];
const FILE_EXT = ['.js', '.ts', '.jsx', '.tsx'];

function shouldSkip(filePath) {
  return EXCLUDE.some(ex => filePath.includes(path.join(path.sep, ex + path.sep)));
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (shouldSkip(full)) continue;
    if (ent.isDirectory()) walk(full);
    else if (ent.isFile() && FILE_EXT.includes(path.extname(ent.name))) processFile(full);
  }
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const orig = src;

  // Regex: from <whitespace> (./ or ../path...) when not followed by a quote
  const re = /from\s+((?:\.\.?\/[^\s'";,)]+))/g;

  src = src.replace(re, (m, p1) => {
    // If p1 already starts with a quote character, skip
    if (/^["']/.test(p1)) return m;
    // Wrap in single quotes
    return `from '${p1}'`;
  });

  if (src !== orig) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Patched:', path.relative(ROOT, file));
  }
}

console.log('Scanning for import paths missing quotes...');
walk(ROOT);
console.log('Done.');
