const fs = require('fs');
const content = fs.readFileSync('electron/main.ts', 'utf8');
// 移除末尾的 }
if (content.endsWith('})}')) {
  const fixed = content.slice(0, -2) + '}';
  fs.writeFileSync('electron/main.ts', fixed, 'utf8');
  console.log('Fixed! File now ends with }');
} else {
  console.log('No change needed. Current ending:', content.slice(-10));
}