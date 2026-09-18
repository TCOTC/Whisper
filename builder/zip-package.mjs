// 打包主题发布包：从 dist/ 读取，保证 package.zip 与链接出去、供思源加载的产物完全一致。
import zip from 'bestzip';
import { distDir, packageFiles, packageZip } from './config.mjs';

await zip({
  cwd: distDir,
  destination: packageZip,
  source: packageFiles(),
});

console.log('✓ package.zip\t zipped');
