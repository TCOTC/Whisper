import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zip from 'bestzip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string[]} 思源主题发布包内包含的文件（相对主题根目录） */
const PACKAGE_FILES = [
  'theme.css',
  'theme.js',
  'theme.json',
  'icon.png',
  'preview.png',
  'README*.md',
];

await zip({
  cwd: root,
  destination: 'package.zip',
  source: PACKAGE_FILES,
});

console.log('✓ package.zip\t zipped');
