import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as fs from 'fs';
import * as sass from 'sass';

// 编译 SCSS 并生成 Source Map
function compileSass() {
  return {
    name: 'compile-sass',
    async writeBundle() {
      const result = sass.compile('../styles/theme.scss', {
        style: 'compressed',
        sourceMap: true,
      });
      
      fs.writeFileSync('../theme.css', result.css + '/*# sourceMappingURL=theme.css.map */');
      console.log('✓ theme.css\t generated');
      
      if (result.sourceMap) {
        fs.writeFileSync('../theme.css.map', JSON.stringify(result.sourceMap));
        console.log('✓ theme.css.map\t generated');
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
        assetFileNames: 'theme-vite.css', // 确保 Vite 生成的 CSS 文件不会与 compileSass() 生成的 theme.css 冲突
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