// 主题构建入口：默认执行一次生产构建，--watch 时以开发模式持续监听并重建 dist/。
import { existsSync, readdirSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import { compileTheme } from './compile.mjs';
import { iconsDir, root, staticFiles, stylesDir } from './config.mjs';

// 通过命令行参数区分开发模式（--watch）与生产构建
const isDev = process.argv.includes('--watch');

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

function rebuild(label) {
  console.log(`changed: ${label}`);
  compileTheme({ dev: isDev }).catch((error) => console.error(error));
}

// 样式、图标与静态文件都监听：任一改动都要重新生成 dist/，否则链接出去的主题会停留在旧内容
function watchSources() {
  for (const dir of [stylesDir, iconsDir]) {
    if (existsSync(dir)) {
      watchRecursive(dir, (_event, filename) => rebuild(filename || dir));
    }
  }
  for (const name of staticFiles()) {
    const file = resolve(root, name);
    if (existsSync(file)) {
      watch(file, () => rebuild(name));
    }
  }
}

try {
  await compileTheme({ dev: isDev });
  if (isDev) {
    watchSources();
    console.log('watching styles/, icons/ and theme assets ...');
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
