# style 文件夹

- 颜色工具: `_functions.scss`
- 模块外观: `modules/`
- 界面配色: `_appearance.scss`
- 文本配色: `_text.scss`
- 文本外观: `_text-layout.scss`

// TODO功能 支持切换配色方案

界面配色：
- 原生：无 `data-whisper-appearance`（配置 `appearance_light` / `appearance_dark` 为空）
- 胭脂 / 石墨：Blush / Graphite（配置默认 `blush` / `graphite`）

文本配色：
- 原生：无 `data-whisper-text`（配置 `text` 为空，不附加 Whisper 文本样式）
- 七彩：Seven（配置默认 `seven`）

方法: 使用 JS 给根元素添加属性，然后使用属性选择器：

```scss
html[data-theme-mode="light"][data-whisper-appearance="blush"] {
  // 界面配色
}
html[data-theme-mode="light"][data-whisper-text="seven"] {
  // 文本配色（七彩）
}
```

- 内置配色: 精调配色
- 切换配色: 用跟 Asri 或 Savor 一样的动画 (ViewTransition)、配色模式要存储在工作空间中（不同步）
- 动态配色: 像 Asri 那种动态的颜色选择器
  p.s. 看到 Asri 用的方案是修改 html 元素的 style，感觉不够安全，第三方代码修改 style 时可能没有考虑到保留原来的样式而直接覆盖掉
