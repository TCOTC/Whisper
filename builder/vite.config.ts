import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as fs from 'fs';
import * as sass from 'sass';

// 通过检查命令行参数来区分开发模式（--watch）和生产构建模式
const isDev = process.argv.includes('--watch');

// 编译 SCSS 并生成 Source Map，同时处理图标内联
function compileSass() {
  return {
    name: 'compile-sass',
    async writeBundle() {
      // 读取所有图标文件
      const iconFiles = new Map<string, string>();
      
      // 递归读取图标目录
      function readIconDir(dirPath: string, prefix: string = '') {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const fullPath = resolve(dirPath, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            readIconDir(fullPath, `${prefix}${file}/`);
          } else if (file.endsWith('.svg')) {
            const iconPath = `${prefix}${file}`;
            const iconContent = fs.readFileSync(fullPath, 'utf8');
            iconFiles.set(iconPath, iconContent);
          }
        }
      }
      
      // 读取 icons 目录
      const iconsDir = resolve(__dirname, '../icons');
      if (fs.existsSync(iconsDir)) {
        readIconDir(iconsDir);
      }
      
      // 编译 SCSS
      const result = sass.compile('../styles/theme.scss', {
        style: 'compressed',
        sourceMap: true,
      });
      
      // 处理图标内联
      let processedCss = result.css;
      
      if (isDev) {
        // 开发环境下把 $themeIcons 别名替换为 ./icons/ 路径，不影响 theme.css.map
        const iconAliasRegex = /\$themeIcons/g;
        processedCss = processedCss.replace(iconAliasRegex, './icons');
      } else {
        // 生产环境下内联图标
        const iconAliasRegex = /\$themeIcons\/([^"'\s)]+)/g;
        processedCss = processedCss.replace(iconAliasRegex, (match, iconPath) => {
          const iconContent = iconFiles.get(iconPath);
          if (iconContent) {
            // 将 SVG 内容编码为 data URL
            const encodedSvg = encodeURIComponent(iconContent);
            return `data:image/svg+xml,${encodedSvg}`;
          }
          return match; // 如果找不到图标，保持原样
        });
      }
      
      fs.writeFileSync('../dist/theme.css', processedCss);
      
      if (result.sourceMap) {
        fs.writeFileSync('../dist/theme.css.map', JSON.stringify(result.sourceMap));
      }
    }
  };
}

// 复制生成的文件到根目录
function copyThemeFiles() {
  return {
    name: 'copy-theme-files',
    writeBundle() {
      // 复制 theme.js
      if (fs.existsSync('../dist/theme.js')) {
        fs.copyFileSync('../dist/theme.js', '../theme.js');
        console.log('✓ theme.js\t generated');
      }
      if (fs.existsSync('../dist/theme.js.map')) {
        fs.copyFileSync('../dist/theme.js.map', '../theme.js.map');
        console.log('✓ theme.js.map\t generated');
      }

      // 复制 theme.css
      if (isDev) {
        if (fs.existsSync('../dist/theme.css')) {
          const cssContent = fs.readFileSync('../dist/theme.css', 'utf8');
          // 只在开发模式下添加 sourceMap 注释
          const finalContent = cssContent + '/*# sourceMappingURL=theme.css.map */';
          fs.writeFileSync('../theme.css', finalContent);
          console.log('✓ theme.css\t generated');
        }
      } else {
        if (fs.existsSync('../dist/theme-vite.css')) {
          fs.copyFileSync('../dist/theme-vite.css', '../theme.css');
          console.log('✓ theme.css\t generated');
        }
      }
      if (fs.existsSync('../dist/theme.css.map')) {
        fs.copyFileSync('../dist/theme.css.map', '../theme.css.map');
        console.log('✓ theme.css.map\t generated');
      }
    }
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
    }
  };
}

export default defineConfig({
  resolve: {
    alias: {
      $themeIcons: resolve('../icons')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, '../src/theme.ts'),
      name: 'whisperTheme',
      fileName: () => 'theme.js',
      formats: ['iife']
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        keep_fnames: true,
        keep_classnames: true
      },
      mangle: {
        keep_fnames: true,
        keep_classnames: true
      }
    },
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'theme.js',
        assetFileNames: 'theme-vite.css',
        inlineDynamicImports: true
      }
    },
    sourcemap: true
  },
  plugins: [
    compileSass(),
    copyThemeFiles(),
    cleanDist()
  ]
});