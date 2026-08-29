// 主题构建脚本：用 Sass 编译 theme.scss，内联图标，输出 theme.css。
// 不依赖 Vite，开发模式（--watch）用 fs.watch 监听 styles/ 与 icons/ 目录。
import { watch } from 'node:fs';
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAsync } from 'sass';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
// 通过命令行参数区分开发模式（--watch）与生产构建
const isDev = process.argv.includes('--watch');

const themeScss = resolve(root, 'styles/theme.scss');
const stylesDir = resolve(root, 'styles');
const iconsDir = resolve(root, 'icons');
const outCss = resolve(root, 'theme.css');
const outMap = resolve(root, 'theme.css.map');

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

// 递归监听目录；Linux 上 fs.watch 不支持 recursive，退化为逐个子目录监听
function watchRecursive(dir, callback) {
  try {
    watch(dir, { recursive: true }, callback);
  } catch {
    watch(dir, callback);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        watchRecursive(fullPath, callback);
      }
    }
  }
}

async function build() {
  const result = await compileAsync(themeScss, {
    style: isDev ? 'expanded' : 'compressed',
    sourceMap: isDev,
  });

  let css = inlineIcons(result.css, readIconFiles());
  if (isDev && result.sourceMap) {
    writeFileSync(outMap, JSON.stringify(result.sourceMap));
    css += '/*# sourceMappingURL=theme.css.map */';
  } else if (existsSync(outMap)) {
    rmSync(outMap);
  }
  writeFileSync(outCss, css);
  console.log(`✓ theme.css\t generated (${isDev ? 'dev' : 'prod'})`);
}

try {
  if (isDev) {
    await build();
    for (const dir of [stylesDir, iconsDir]) {
      if (existsSync(dir)) {
        watchRecursive(dir, (_event, filename) => {
          if (!filename) {
            return;
          }
          console.log(`changed: ${filename}`);
          build().catch((error) => console.error(error));
        });
      }
    }
    console.log('watching styles/ and icons/ ...');
  } else {
    await build();
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
