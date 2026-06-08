const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const entitiesDir = path.join(srcDir, 'entities');

if (!fs.existsSync(entitiesDir)) {
  fs.mkdirSync(entitiesDir, { recursive: true });
}

const entities = new Set();

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'entities') walk(p);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(p, 'utf8');
      const regex = /from\s+['"]@\/entities\/([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        entities.add(match[1]);
      }
    }
  });
}

walk(srcDir);

entities.forEach(e => {
  const filePath = path.join(entitiesDir, `${e}.js`);
  fs.writeFileSync(filePath, `import { base44SDK } from '../api/client';\nexport const ${e} = base44SDK('${e}');\n`);
});

console.log('Generated entities:', Array.from(entities).join(', '));
