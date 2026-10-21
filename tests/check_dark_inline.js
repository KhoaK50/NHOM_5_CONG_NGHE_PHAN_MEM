import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist') scanDir(full);
    } else if (f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((l, i) => {
        // Match dark hex colors (0-2 in first hex digit) in background
        if (/background(-color)?\s*:\s*[^;]*#[0-2][0-9a-fA-F]{5}/i.test(l) ||
            /backgroundColor\s*:\s*['"]#[0-2][0-9a-fA-F]{5}['"]/i.test(l)) {
          console.log(`${full}:${i + 1} -> ${l.trim()}`);
        }
      });
    }
  }
}

scanDir('./client/src');
