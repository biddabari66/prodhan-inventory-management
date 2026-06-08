const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'src');
const funcsDir = path.join(srcDir, 'functions');

if (!fs.existsSync(funcsDir)) {
  fs.mkdirSync(funcsDir, { recursive: true });
}

const funcs = new Set();

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'functions') walk(p);
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      const content = fs.readFileSync(p, 'utf8');
      const regex = /from\s+['"]@\/functions\/([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        funcs.add(match[1]);
      }
    }
  });
}

walk(srcDir);

funcs.forEach(fn => {
  const filePath = path.join(funcsDir, `${fn}.js`);
  fs.writeFileSync(filePath, `export const ${fn} = async () => { console.log('${fn} not implemented yet'); return {}; };\n`);
});

console.log('Generated functions:', Array.from(funcs).join(', '));
