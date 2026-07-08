// 将 CSS 颜色转换为 OKLCH 字符串（供手写配色 map 时参考）
//
// 用法: node tools/gen-oklch.mjs <css-color> [...]
// 示例: node tools/gen-oklch.mjs "rgb(126, 121, 0)" "rgba(0, 0, 0, .2)"

import * as sass from 'sass';

function toOklch(cssColor) {
  const out = sass.compileString(`
    @use "sass:color";
    @use "sass:math";
    $c: ${cssColor};
    $ok: color.to-space($c, oklch);
    $l: math.div(color.channel($ok, "lightness", $space: oklch), 1%);
    $ch: color.channel($ok, "chroma", $space: oklch);
    $hue: math.div(color.channel($ok, "hue", $space: oklch), 1deg);
    $a: color.channel($c, "alpha");
    .x { l: #{$l}; ch: #{$ch}; hue: #{$hue}; a: #{$a}; }
  `, { style: 'expanded' });

  const get = (name) => {
    const m = out.css.match(new RegExp(`${name}:\\s*([^;\\n]+)`));
    return m ? parseFloat(m[1].trim()) : null;
  };

  const fmt = (n) => n.toFixed(4).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  const l = get('l');
  const ch = get('ch');
  const hue = get('hue');
  const a = get('a');

  return a < 1
    ? `oklch(${fmt(l)}% ${fmt(ch)} ${fmt(hue)} / ${a})`
    : `oklch(${fmt(l)}% ${fmt(ch)} ${fmt(hue)})`;
}

const colors = process.argv.slice(2);
if (colors.length === 0) {
  console.error('用法: node tools/gen-oklch.mjs <css-color> [...]');
  console.error('示例: node tools/gen-oklch.mjs "rgb(126, 121, 0)" "rgba(0, 0, 0, .2)"');
  process.exit(1);
}

for (const color of colors) {
  console.log(`${color} -> ${toOklch(color)}`);
}
