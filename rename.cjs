const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', 'dist'];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  content = content.replace(/Xoxo/g, 'Kudos');
  content = content.replace(/xoxo/g, 'kudos');
  content = content.replace(/XOXO/g, 'KUDOS');
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE_DIRS.includes(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else {
      // only text files
      const ext = path.extname(fullPath);
      if (['.js', '.jsx', '.json', '.md', '.html', '.css', '.sql', '.txt', ''].includes(ext)) {
        // exclude lockfile to avoid breaking it, though changing xoxo to kudos in package.json is fine
        if (file !== 'package-lock.json' && file !== 'rename.js') {
           replaceInFile(fullPath);
        }
      }
    }
  }
}

walkDir(__dirname);
