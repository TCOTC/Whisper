// 把构建产物 dist/ 链接进思源的主题目录，开发期间无需复制文件，改完样式重建即可在思源中重新加载主题。
// 用法：pnpm theme:link <思源主题目录，通常是 <工作空间>/data/themes>
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { compileTheme } from './compile.mjs';
import { distDir, root, themeJson } from './config.mjs';

// Windows 上目录符号链接需要开发者模式，失败时退化为 junction
const FALLBACK_CODES = ['EPERM', 'EACCES', 'UNKNOWN'];

const themesDirArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
if (!themesDirArg) {
  console.error('用法: pnpm theme:link <思源主题目录，通常是 <工作空间>/data/themes>');
  process.exit(1);
}

const themesDir = resolve(themesDirArg);
// 主题目录名取 theme.json 的 name，与思源识别主题的方式一致
const themeName = JSON.parse(readFileSync(themeJson, 'utf8')).name;
const linkPath = resolve(themesDir, themeName);

if (linkPath === root) {
  console.error(`✗ ${linkPath} 是本仓库自身，无法在这里建立链接`);
  process.exit(1);
}

// 仅清理链接与空目录：已有真实目录时直接报错，避免误删开发目录
function clearLinkPath() {
  const existing = lstatSync(linkPath, { throwIfNoEntry: false });
  if (!existing) {
    return;
  }
  if (existing.isSymbolicLink()) {
    unlinkSync(linkPath);
    return;
  }
  if (!existing.isDirectory()) {
    console.error(`✗ ${linkPath} 已存在且不是目录，请先手动移动或删除它`);
    process.exit(1);
  }
  try {
    rmdirSync(linkPath);
  } catch {
    console.error(`✗ ${linkPath} 已存在且不是空目录，请先手动移动或删除它`);
    process.exit(1);
  }
}

function createLink() {
  try {
    symlinkSync(distDir, linkPath, 'dir');
  } catch (error) {
    if (process.platform !== 'win32' || !FALLBACK_CODES.includes(error.code)) {
      throw error;
    }
    symlinkSync(distDir, linkPath, 'junction');
  }
}

try {
  if (!existsSync(themesDir)) {
    mkdirSync(themesDir, { recursive: true });
    console.log(`✓ created\t ${themesDir}`);
  }
  clearLinkPath();
  // 思源要求主题目录下同时存在 theme.json 与 theme.css，故产物缺失时先构建一次；
  // 产物已存在则保留现状，避免清空目录干扰正在运行的 pnpm dev
  if (existsSync(resolve(distDir, 'theme.css'))) {
    console.log('✓ dist/theme.css\t exists, skipped');
  } else {
    await compileTheme();
  }
  createLink();
  console.log(`✓ linked\t ${linkPath} 指向 ${distDir}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
