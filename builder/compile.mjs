// 主题编译：Sass 编译 styles/theme.scss，内联 icons/ 下的 SVG，产物与静态文件一起写入 dist/。
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { compileAsync } from 'sass';
import { distDir, iconsDir, packageFiles, root, staticFiles } from './config.mjs';

const themeScss = resolve(root, 'styles/theme.scss');

// 生产构建清理 dist/ 中不属于发布包的残留文件（开发构建留下的 theme.css.map、已从仓库删除的文件）；
// 发布包内的文件由随后的编译与复制覆盖，因此无需删除并重建整个目录，思源读取主题期间不会出现目录缺失
function cleanUnpackedFiles() {
  const packed = new Set(packageFiles());
  for (const entry of readdirSync(distDir, { withFileTypes: true })) {
    if (!packed.has(entry.name)) {
      rmSync(resolve(distDir, entry.name), { recursive: true, force: true });
    }
  }
}

// 递归收集 icons 目录下的全部 SVG 文件内容
function readIconFiles() {
  const iconFiles = new Map();
  function readIconDir(dirPath, prefix = '') {
    for (const file of readdirSync(dirPath)) {
      const fullPath = resolve(dirPath, file);
      if (statSync(fullPath).isDirectory()) {
        readIconDir(fullPath, `${prefix}${file}/`);
      } else if (file.endsWith('.svg')) {
        iconFiles.set(`${prefix}${file}`, readFileSync(fullPath, 'utf8'));
      }
    }
  }
  if (existsSync(iconsDir)) {
    readIconDir(iconsDir);
  }
  return iconFiles;
}

// Sass 会保留相对路径层数（如 ../../icons 或 ../../../icons），故匹配任意层 ../，将图标内联为 data URI
function inlineIcons(css, iconFiles) {
  return css.replace(
    /url\((['"]?)(?:\.\.\/)+icons\/([^"')]+)\1\)/g,
    (match, _quote, iconPath) => {
      const iconContent = iconFiles.get(iconPath);
      return iconContent
        ? `url("data:image/svg+xml,${encodeURIComponent(iconContent)}")`
        : match;
    },
  );
}

/** 编译主题并把静态文件同步进 dist/，使 dist/ 本身就是可被思源识别的完整主题目录 */
export async function compileTheme({ dev = false } = {}) {
  mkdirSync(distDir, { recursive: true });
  if (!dev) {
    cleanUnpackedFiles();
  }
  const result = await compileAsync(themeScss, {
    style: dev ? 'expanded' : 'compressed',
    sourceMap: dev,
  });

  let css = inlineIcons(result.css, readIconFiles());
  if (dev && result.sourceMap) {
    writeFileSync(resolve(distDir, 'theme.css.map'), JSON.stringify(result.sourceMap));
    css += '/*# sourceMappingURL=theme.css.map */';
  }
  writeFileSync(resolve(distDir, 'theme.css'), css);

  // theme.json、图标与 README 不参与编译，改动后同样需要刷新，否则 dist/ 会停留在旧内容
  for (const name of staticFiles()) {
    copyFileSync(resolve(root, name), resolve(distDir, name));
  }
  console.log(`✓ dist/theme.css\t generated (${dev ? 'dev' : 'prod'})`);
}
