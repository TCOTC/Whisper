# style 文件夹

- 界面配色: appearance
- 模块外观: module
- 文本外观: text

// TODO功能 支持切换配色方案

方法: 使用 JS 给根元素添加属性，比如 data-whisper-theme-scheme，然后在 SCSS 中使用属性选择器

p.s. 看到 Asri 用的方案是修改 html 元素的 style，感觉不够安全，第三方代码修改 style 时可能没有考虑到保留原来的样式而直接覆盖掉

```scss
html[data-theme-mode="light"][data-whisper-theme-scheme-appearance="gray"] {
  // 界面配色
}
html[data-theme-mode="light"][data-whisper-theme-scheme-text="seven"] {
  // 文本外观
}
```

- 内置配色: 精调配色
- 切换配色: 用跟 Asri 一样的动画 (ViewTransition)、配色模式要存储在工作空间中（不同步）
- 动态配色: 像 Asri 那种动态的颜色选择器
