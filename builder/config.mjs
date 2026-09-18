// 主题构建的共享路径与文件清单：build.mjs、compile.mjs、zip-package.mjs、link.mjs 共用，避免多处清单各自维护后漂移。
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 仓库根目录，即 builder/ 的上一级 */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** 构建产物目录，也是软链接指向的源目录 */
export const distDir = resolve(root, 'dist');
export const stylesDir = resolve(root, 'styles');
export const iconsDir = resolve(root, 'icons');
/** 主题发布包，位于仓库根目录 */
export const packageZip = resolve(root, 'package.zip');
export const themeJson = resolve(root, 'theme.json');

// 不参与编译、每次构建原样复制进 dist 的文件
const STATIC_FILES = ['theme.json', 'icon.png', 'preview.png'];

/** 需要写入 dist 的静态文件清单，各语言 README 按目录内容收集 */
export function staticFiles() {
  const readmes = readdirSync(root).filter((name) => /^README(\..+)?\.md$/.test(name));
  return [...STATIC_FILES, ...readmes];
}

/** 发布包内的文件清单，不含仅供开发调试的 theme.css.map */
export function packageFiles() {
  return [...staticFiles(), 'theme.css'];
}
