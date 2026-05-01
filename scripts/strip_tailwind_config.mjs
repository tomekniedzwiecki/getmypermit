import fs from 'fs';
import path from 'path';

const ROOT = 'c:/repos_tn/getmypermit';
const targets = [];
for (const dir of [ROOT, ROOT + '/crm']) {
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.html')) targets.push(path.join(dir, f));
  }
}

let changed = 0;
for (const fp of targets) {
  let content = fs.readFileSync(fp, 'utf8');
  // Match <script>...tailwind.config...</script> (greedy, multiline)
  const re = /<script[^>]*>[\s\S]*?tailwind\.config[\s\S]*?<\/script>\s*/g;
  const matches = content.match(re);
  if (!matches) continue;
  content = content.replace(re, '');
  fs.writeFileSync(fp, content, 'utf8');
  changed++;
  console.log(`  ${path.basename(fp)}: removed ${matches.length} block(s)`);
}
console.log(`Total: ${changed} files cleaned`);
