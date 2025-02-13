# TODO 支持切换配色方案

方法：使用 JS 给根元素添加属性，比如 data-whisper-theme-scheme，然后在 SCSS 中使用属性选择器：

```scss
html[data-theme-mode="light"][data-whisper-theme-scheme="blue"] {
  // 配色方案
}
```

- 内置配色：精调配色
- 动态配色：像 Asri 那种