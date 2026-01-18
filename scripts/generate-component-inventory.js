#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// SvelteKit component locations
const componentDirs = ['src/lib/components'];
const outputFile = 'docs/_generated/components.md';

fs.mkdirSync(path.dirname(outputFile), { recursive: true });

function getComponents(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];

  const items = fs.readdirSync(dir, { withFileTypes: true });
  let components = [];

  for (const item of items) {
    if (item.isDirectory()) {
      components.push(...getComponents(path.join(dir, item.name), `${prefix}${item.name}/`));
    } else if (item.name.endsWith('.svelte') && !item.name.startsWith('+')) {
      // Skip route files (+page.svelte, +layout.svelte)
      components.push(`${prefix}${item.name.replace('.svelte', '')}`);
    }
  }

  return components;
}

let allComponents = [];
for (const dir of componentDirs) {
  allComponents.push(...getComponents(dir));
}

// Dedupe
allComponents = [...new Set(allComponents)];

let output = `# Components

*Auto-generated from src/lib/*

| Component | Path |
|-----------|------|
`;

for (const comp of allComponents.sort()) {
  output += `| ${comp.split('/').pop()} | \`${comp}\` |\n`;
}

output += `\n*${allComponents.length} components*\n`;

fs.writeFileSync(outputFile, output);
console.log(`Generated ${outputFile}`);
