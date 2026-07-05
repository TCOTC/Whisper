import { defineConfig, type Plugin } from 'vite';
import { resolve, dirname } from 'path';
import { createRequire } from 'node:module';
import * as fs from 'fs';
import * as sass from 'sass';

const require = createRequire(import.meta.url);
// chokidar 由 Vite 间接依赖，通过 createRequire 复用，避免额外安装
const chokidar = require(require.resolve('chokidar', {
  paths: [require.resolve('vite')],
})) as {
  watch: (paths: string | string[], options?: { ignoreInitial?: boolean }) => {
    on: (event: string, listener: () => void) => void;
    close: () => Promise<void>;
  };
};
// 通过检查命令行参数来区分开发模式（--watch）和生产构建模式
const isDev = process.argv.includes('--watch');

const themeScss = resolve(__dirname, '../styles/theme.scss');
const emptyScss = resolve(__dirname, 'empty.scss');
const stylesDir = resolve(__dirname, '../styles');
const iconsDir = resolve(__dirname, '../icons');
const scssWatchTrigger = resolve(__dirname, '.scss-watch-trigger');
function readIconFiles(): Map<string, string> {
  const iconFiles = new Map<string, string>();

  function readIconDir(dirPath: string, prefix: string = '') {
    for (const file of fs.readdirSync(dirPath)) {
      const fullPath = resolve(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readIconDir(fullPath, `${prefix}${file}/`);
      } else if (file.endsWith('.svg')) {
        iconFiles.set(`${prefix}${file}`, fs.readFileSync(fullPath, 'utf8'));
      }
    }
  }

  if (fs.existsSync(iconsDir)) {
    readIconDir(iconsDir);
  }

  return iconFiles;
}

function inlineIcons(css: string, iconFiles: Map<string, string>): string {
  return css.replace(
    /url\((['"]?)\.\.\/\.\.\/icons\/([^"')]+)\1\)/g,
    (_match, _quote, iconPath: string) => {
      const iconContent = iconFiles.get(iconPath);
      if (!iconContent) {
        return _match;
      }
      return `url("data:image/svg+xml,${encodeURIComponent(iconContent)}")`;
    },
  );
}

// 开发模式下将 theme.scss 替换为空桩，避免 Vite 重复编译 CSS
function stubDevThemeScss(): Plugin {
  return {
    name: 'stub-dev-theme-scss',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isDev) {
        return null;
      }
      if (source === themeScss) {
        return emptyScss;
      }
      if (source === '../styles/theme.scss' && importer) {
        return emptyScss;
      }
      if (importer && resolve(dirname(importer), source) === themeScss) {
        return emptyScss;
      }
      return null;
    },
  };
}

// 开发模式下用 chokidar 监听目录，通过触发文件让 Rolldown 重建
function watchScss(): Plugin {
  let watcher: ReturnType<typeof chokidar.watch> | undefined;

  return {
    name: 'watch-scss',
    buildStart() {
      if (!isDev || watcher) {
        return;
      }

      if (!fs.existsSync(scssWatchTrigger)) {
        fs.writeFileSync(scssWatchTrigger, '');
      }
      this.addWatchFile(scssWatchTrigger);

      const bumpTrigger = () => {
        const now = new Date();
        fs.utimesSync(scssWatchTrigger, now, now);
      };

      const watchDirs = [stylesDir, iconsDir].filter((dir) => fs.existsSync(dir));
      watcher = chokidar.watch(watchDirs, { ignoreInitial: true });
      watcher.on('all', bumpTrigger);
    },
    closeWatcher() {
      void watcher?.close();
      watcher = undefined;
    },
  };
}
// 开发模式下用 Sass 生成 theme.css 与 source map
function emitDevCssSourceMap() {
  return {
    name: 'emit-dev-css-sourcemap',
    writeBundle() {
      if (!isDev) {
        return;
      }

      const result = sass.compile(themeScss, {
        style: 'expanded',
        sourceMap: true,
      });

      const css = inlineIcons(result.css, readIconFiles());

      if (result.sourceMap) {
        fs.writeFileSync('../theme.css.map', JSON.stringify(result.sourceMap));
        console.log('✓ theme.css.map\t generated');
      }

      fs.writeFileSync('../theme.css', `${css}/*# sourceMappingURL=theme.css.map */`);
      console.log('✓ theme.css\t generated');
    },
  };
}

// 将 dist 产物复制到主题根目录，便于思源加载与 fsnotify 识别
function copyThemeFiles() {
  return {
    name: 'copy-theme-files',
    writeBundle() {
      if (!isDev) {
        for (const mapFile of ['../theme.js.map', '../theme.css.map']) {
          if (fs.existsSync(mapFile)) {
            fs.rmSync(mapFile);
          }
        }
      }

      if (fs.existsSync('../dist/theme.js')) {
        fs.copyFileSync('../dist/theme.js', '../theme.js');
        console.log('✓ theme.js\t generated');
      }
      if (isDev && fs.existsSync('../dist/theme.js.map')) {
        fs.copyFileSync('../dist/theme.js.map', '../theme.js.map');
        console.log('✓ theme.js.map\t generated');
      }
      if (!isDev && fs.existsSync('../dist/theme.css')) {
        fs.copyFileSync('../dist/theme.css', '../theme.css');
        console.log('✓ theme.css\t generated');
      }
    },
  };
}

// 删除 dist 目录
function cleanDist() {
  return {
    name: 'clean-dist',
    writeBundle() {
      if (fs.existsSync('../dist')) {
        fs.rmSync('../dist', { recursive: true, force: true });
        console.log('✓ dist directory removed');
      }
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../src/theme.ts'),
      name: 'whisperTheme',
      fileName: () => 'theme.js',
      formats: ['iife'],
      cssFileName: 'theme',
    },
    minify: isDev ? false : 'terser',
    terserOptions: {
      compress: {
        keep_fnames: true,
        keep_classnames: true,
      },
      mangle: {
        keep_fnames: true,
        keep_classnames: true,
      },
    },
    outDir: '../dist',
    // 开发 watch 时保留 dist，避免反复清空触发目录级 fsnotify 事件
    emptyOutDir: !isDev,
    assetsInlineLimit: Infinity,
    rolldownOptions: {
      output: {
        entryFileNames: 'theme.js',
        codeSplitting: false,
      },
    },
    sourcemap: isDev,
  },
  plugins: isDev
    ? [stubDevThemeScss(), watchScss(), copyThemeFiles(), emitDevCssSourceMap()]
    : [copyThemeFiles(), cleanDist()],
});
