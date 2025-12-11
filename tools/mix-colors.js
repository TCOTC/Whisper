// 另一种混合颜色的方式：用函数 color-mix() 和相对值语法 rgb(from <color> R G B[ / A]) 实现自动混合两种颜色(这个颜色跟JS算出来的是不同的，因为原理不同)，例如：
// --color-mix-theme_primary_background: color-mix(in srgb, rgb(from var(--b3-theme-primary-lightest) calc(r * alpha + 255 * (1 - alpha)) calc(g * alpha + 255 * (1 - alpha)) calc(b * alpha + 255 * (1 - alpha)) / none), var(--b3-theme-background));
// https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value/color-mix
// https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value/rgb#%E8%AF%AD%E6%B3%95

// https://github.com/niklasvh/html2canvas 不支持使用 rgb(from var(--color) r g b / alpha) 语法的颜色
// 但 v3.1.25 换成 html-to-image 之后支持了 https://github.com/siyuan-note/siyuan/issues/14161

// 用于混合两种颜色

function parseColor(colorString) {
    // 去掉括号并分割字符串
    const cleanedString = colorString.replace(/[()]/g, '').trim();
    const components = cleanedString.split(',').map(Number);

    // 提取 RGB 和 Alpha 值
    const [r, g, b, a] = components;

    // 如果没有提供 Alpha 值，默认为 1
    return {
        r: r,
        g: g,
        b: b,
        a: a !== undefined ? a : 1
    };
}

function mixColors(fg, bg) {
    const fgR = fg.r;
    const fgG = fg.g;
    const fgB = fg.b;
    const fgA = fg.a;

    const bgR = bg.r;
    const bgG = bg.g;
    const bgB = bg.b;
    const bgA = bg.a;

    // 计算混合后的颜色和透明度
    const resultR = (fgR * fgA) + (bgR * bgA * (1 - fgA));
    const resultG = (fgG * fgA) + (bgG * bgA * (1 - fgA));
    const resultB = (fgB * fgA) + (bgB * bgA * (1 - fgA));

    // 计算最终的 alpha 值
    const resultA = fgA + bgA * (1 - fgA);

    return {
        r: Math.round(resultR), // 四舍五入 RGB 值
        g: Math.round(resultG),
        b: Math.round(resultB),
        a: Math.round(resultA * 100) / 100 // 四舍五入 Alpha 值到两位小数
    };
}

function mixAndLogColors() {
    const foreground = parseColor(foregroundString);
    const background = parseColor(backgroundString);
    const mixedColor = mixColors(foreground, background);

    if (mixedColor.a === 1) {
        console.log(`混合后的颜色: rgb(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b})`);
    } else {
        console.log(`混合后的颜色: rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, ${mixedColor.a.toFixed(2)})`);
    }
}

// 输入颜色字符串，带透明通道的颜色填入 foregroundString
const foregroundString = "(165, 157, 51, .54)"; // 形式为 (165, 157, 51, .54),(165, 157, 51, 0.54),(165, 157, 51)
const backgroundString = "(165, 157, 51, .38)";
mixAndLogColors();
