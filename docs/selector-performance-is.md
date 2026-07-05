# CSS 选择器性能：`:is()` 与展开形式

> 文件名使用 `selector-performance-is.md` 而非 `selector-performance-:is.md`，因为 Windows 文件系统禁止路径中出现 `:`。

本文档整理 Whisper 主题开发中关于 `:is()` 伪类与逗号展开选择器的性能讨论，供编写与审查样式时参考。

## 背景

CSS 中以下两种写法语义等价：

```css
/* :is() 形式 */
:is(.foo, .bar):hover > .baz {
  color: red;
}

/* 展开形式 */
.foo:hover > .baz,
.bar:hover > .baz {
  color: red;
}
```

常见疑问：

- Sass / SCSS 能否配置自动展开 `:is()`？**不能**（见下文「与本项目构建的关系」）。
- 两种写法哪个更快？**没有绝对答案**，取决于分支数量、选择器复杂度、DOM 规模与浏览器实现；但在当前引擎下，**展开形式在多种真实场景中往往更占优**。

## 浏览器如何匹配选择器

### Subject 与匹配方向

以上例为例，`color: red` 作用在 **`.baz`** 上，`.baz` 是这条规则的 **subject**（被样式命中的元素）。

规范语义：一个 `.baz` 元素，其**直接父元素**满足「是 `.foo` 或 `.bar`，且处于 `:hover` 状态」。

主流引擎（Blink、WebKit、Gecko）为效率通常采用 **从右向左** 匹配：

1. 候选元素是否为 `.baz`
2. 向上检查父元素是否满足 `:is(.foo, .bar):hover`

**不是**「先找所有 `.foo:hover`，再向下扫 `.baz`」。失效路径（例如父元素刚获得 `:hover`）可能从不同方向触发，但全量匹配一般以 subject 为起点。

### 无法从写法预判性能

WebKit 工程师 Benjamin Poulain（引自 [Browser representatives on CSS performance](https://benfrain.com/browser-representatives-on-css-performance/)）：

> 几乎不可能只凭选择器文本预测最终性能。引擎会重排、拆分、收集、编译选择器；要知道性能，还需知道规则进了哪个 bucket、如何编译、DOM 长什么样——各引擎差异很大。

因此：**不要凭直觉猜哪种写法更快**，有疑虑时用 DevTools 实测。

## 理论对比

| 维度 | `:is()`（一条规则） | 展开（N 条规则） |
|------|---------------------|------------------|
| 规则表大小 | 1 条 | N 条 |
| 单条选择器复杂度 | 较高（内含 OR 分支） | 较低（扁平选择器） |
| 匹配 subject 时需考虑的规则数 | 1 | N |
| 父级 / 祖先验证 | O(k)，k = 分支数 | N 次独立 O(1) 检查 |

### 何时 `:is()` 理论上更优

**分支多且共用同一声明块**时，规则数从 O(k) 降为 O(1)，样式表更小，级联处理更轻：

```css
:is(.a, .b, .c, .d, .e, .f):hover > .item { ... }
```

### 何时展开理论上更优

**分支少（2～3 个）、选择器简单**时：

- 无 `:is()` 伪类间接层
- 每条规则可编译为更直接的匹配路径
- 在部分引擎上能更好地利用祖先 Bloom Filter（见下文）

对 2 分支的简单例子，两者渐近复杂度都是 O(k)，差距通常在常数级。

## 引擎实现：祖先 Bloom Filter

W3C CSS 嵌套讨论（[csswg-drafts #8310](https://github.com/w3c/csswg-drafts/issues/8310)）中，Blink 工程师指出：

> 对 `:is(a, b) c`，**无法**用祖先 Bloom Filter 在 `a` / `b` 子树之外快速拒绝该规则。祖先过滤器往往是复杂样式表保持可接受性能的关键。

同讨论中补充：

- **单参数** `:is(.foo)`：引擎可视为与 `.foo` 同等优化（bucketing + Bloom filter）
- **多参数** `:is()`：Bloom OR 查询理论上可行，但**当时尚未实现**

**实践含义**：祖先侧带多分支 `:is()` 的长后代链，展开后每条规则更可能走快速拒绝路径。

### 引擎侧优化（仍在演进）

| 来源 | 内容 |
|------|------|
| [WebKit 38b6ce2](https://github.com/oven-sh/WebKit/commit/38b6ce2aafaa50e1f214cc20c89cfab7c709406c) | 单参数 `:is(.class)` 进入 class bucket，性能测试约 70 → 1050 runs/s |
| [WebKit 4aa613f](https://github.com/WebKit/WebKit/commit/4aa613f0482e19865326219338d1df5e160e5619) | `:is(h1, …, h6)` 首个匹配后提前短路 |
| [Chromium c2ab413](https://github.com/chromium/chromium/commit/c2ab413e8ff173121e91e9072fd3bd4988a7cdf6) | 废弃基于展开的 `:is()` 实现，改为原生匹配 |

引擎在优化 `:is()`，但**复杂祖先 + 多分支 + 伪元素**组合仍是已知痛点。

## 真实项目案例

### PatternFly（2024）

[Issue #6720](https://github.com/patternfly/patternfly/issues/6720)：floating `:is()` 导致显著性能问题。

- Performance 测试处理时间约 **210 秒**
- Match attempts 约 **169 万**，match count 仅 **9309**

[PR #6995](https://github.com/patternfly/patternfly/pull/6995)：改为逗号展开后，减少约 **15 万**次不必要的 match attempts。

### CKEditor 5（2026）

[Issue #20058](https://github.com/ckeditor/ckeditor5/issues/20058)：大 DOM（约 7000 元素）上，`:is(长列表…) ::selection` 耗时 **0.786 ms**，slow-path non-matches **100%**。

修复：对以 `::selection`、`::before`、`::after` 结尾的选择器**保持展开**，不用 `:is()` 包裹：

```css
/* 慢 */
:is(.a .b td.selected, .a .b th.selected) ::selection { }

/* 快 */
.a .b td.selected ::selection,
.a .b th.selected ::selection { }
```

## 综合结论

| 场景 | 更可能占优的写法 |
|------|------------------|
| 简单、分支少（2～3 个类名） | 接近等价，难以可靠预判 |
| 祖先侧 `:is(.a, .b)` + 后代选择器 | **展开** |
| `:is()` 内大量分支 + 共用声明 | **`:is()`** |
| 复杂嵌套 + `::selection` / `::before` / `::after` | **展开** |
| 大 DOM + 高 match attempts + 低 match count | **展开** |

**一句话**：当前浏览器实现下，对「祖先侧 `:is()` + 后代链」类写法，**展开在理论与实测上都更常被推荐**；`:is()` 的优势主要在「大量简单分支合并为一条规则」时。

一般静态页面中，选择器很少是瓶颈；大 DOM、频繁 DOM 变动、超大样式表时才值得针对性优化。

## 与本项目构建的关系

Whisper 主题通过 `builder/vite.config.ts` 直接调用 `sass.compile()`，**未使用 PostCSS**。

### Sass 嵌套默认展开

SCSS 嵌套会编译为逗号列表，**不会**生成 `:is()`：

```scss
.error,
#404 {
  &:hover > .baz {
    color: red;
  }
}
```

```css
.error:hover > .baz, #404:hover > .baz {
  color: red;
}
```

### 无法通过 Sass 配置展开 `:is()`

Dart Sass **没有**「自动把 `:is()` 展开为扁平选择器」的选项。若需展开，须在 PostCSS 阶段使用例如 `@csstools/postcss-is-pseudo-class`——当前项目未接入。

### 思源运行环境

思源笔记基于 **Electron（Chromium）**，`:is()` 支持完整。性能讨论主要影响写法选择，而非兼容性。

## 编写建议（Whisper 主题）

1. **继续用 Sass 嵌套 + 逗号并列**，等价于展开路线，与上述结论一致。
2. **避免手写**：
   - 祖先链很长还包进 `:is()`
   - `:is()` 再接 `::before`、`::selection` 等伪元素
   - 列表内十几个复杂分支
3. **不要为性能在 `:is()` 与展开之间做微优化**；优先可读性与维护性。
4. **真怀疑瓶颈时**：Chrome DevTools → Performance → **Selector Stats**，关注：
   - `Elapsed (ms)` 高
   - `Match Attempts` 高而 `Match Count` 低
   - `% of slow-path non-matches` 高

## 参考资料

- [Sass and Native Nesting](https://sass-lang.com/blog/sass-and-native-nesting/) — Sass 与原生 CSS 嵌套语义差异
- [The truth about CSS selector performance](https://blogs.windows.com/msedgedev/2023/01/17/the-truth-about-css-selector-performance/) — Microsoft Edge 团队
- [Browser representatives on CSS performance](https://benfrain.com/browser-representatives-on-css-performance/) — 各引擎代表观点
- [csswg-drafts #8310](https://github.com/w3c/csswg-drafts/issues/8310) — 嵌套与 Bloom Filter 讨论
- [Chrome DevTools: Selector Stats](https://developer.chrome.com/docs/devtools/performance/selector-stats)
- [Stack Overflow: :is() performance](https://stackoverflow.com/questions/76774308/in-css-is-performance-increased-by-using-the-is-pseudo-class)
