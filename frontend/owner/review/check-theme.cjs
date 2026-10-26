// Owner keeps a CSS copy of the mobile palette without importing React Native into Vite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, '../src/styles/theme.ts'), 'utf8');
const colorsBlock = source.match(/export const colors = \{([\s\S]*?)\} as const/);
assert(colorsBlock, 'Cannot read the mobile palette');
const colors = [...colorsBlock[1].matchAll(/(\w+):\s*'(#[0-9a-f]+)'/gi)];
const kebab = value => value.replace(/[A-Z]/g, char => '-' + char.toLowerCase());
const declarations = colors.map(([, name, value]) => `  --agri-${kebab(name)}: ${value.toUpperCase()};`);
for (const name of ['primary', 'title', 'surface', 'warning', 'success', 'danger', 'primarySoft']) {
  const [, , hex] = colors.find(([, key]) => key === name);
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(' ');
  declarations.push(`  --agri-${kebab(name)}-rgb: ${rgb};`);
}
const generated = `/* Generated from frontend/src/styles/theme.ts. Run npm run theme:sync after mobile token changes. */\n:root {\n${declarations.join('\n')}\n}\n`;
const paletteFile = path.join(root, 'src/styles/mobile-palette.css');
if (process.argv.includes('--write')) fs.writeFileSync(paletteFile, generated);
assert.equal(fs.readFileSync(paletteFile, 'utf8'), generated, 'Mobile palette drift: run npm run theme:sync');

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [sourceFile, ownerFile] of [['icon.png', 'agrifarm.png'], ['base.png', 'login-background.png']]) {
  assert.equal(sha(path.join(root, '../assets/images', sourceFile)), sha(path.join(root, 'public/branding', ownerFile)),
    `Brand asset drift: copy frontend/assets/images/${sourceFile} to public/branding/${ownerFile}`);
}

const themeFile = path.join(root, 'src/styles/theme.css');
const theme = fs.readFileSync(themeFile, 'utf8');
const cssSources = [theme, generated];
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(css|tsx?)$/.test(file)) files.push(file);
  }
}
walk(path.join(root, 'src'));
for (const file of files) {
  if ([themeFile, paletteFile].includes(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  cssSources.push(content);
  // QR code modules use a fixed dark color for scanning. SVG grid fragment IDs are not colors.
  const checked = content.replace(/fgColor="#[0-9a-f]+"/gi, '').replace(/url\(#[^)]+\)/g, '');
  assert(!/#[0-9a-f]{3,8}\b|rgba?\(\s*\d/i.test(checked), `Hardcoded color outside palette: ${path.relative(root, file)}`);
}
const all = cssSources.join('\n');
const defined = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
for (const [, name] of all.matchAll(/var\((--[\w-]+)/g)) {
  assert(defined.has(name), `Undefined CSS variable: ${name}`);
}
const values = Object.fromEntries([...all.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)]
  .map(([, name, value]) => [name, value.trim()]));
function resolve(name, seen = new Set()) {
  assert(!seen.has(name), `CSS alias cycle: ${name}`);
  seen.add(name);
  const value = values[name];
  assert(value, `Missing token: ${name}`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? resolve(alias[1], seen) : value;
}
function luminance(name) {
  const hex = resolve(name);
  assert(/^#[0-9a-f]{6}$/i.test(hex), `Expected opaque hex for contrast pair: ${name}`);
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
for (const [foreground, background] of [
  ['white', 'primary'], ['title', 'background'], ['text', 'surface'],
  ['muted-strong', 'surface'], ['muted-strong', 'background'],
  ['success-text', 'success-soft'], ['success-text', 'primary-soft'],
  ['warning-text', 'warning-soft'], ['danger-text', 'danger-soft'], ['info-text', 'info-soft'],
]) {
  const a = luminance('--agri-' + foreground), b = luminance('--agri-' + background);
  assert((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
    `Insufficient text contrast: ${foreground} on ${background}`);
}
console.log(`Theme check passed: ${colors.length} mobile tokens, matching brand assets, ${files.length} source files checked.`);
