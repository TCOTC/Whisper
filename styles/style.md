# style 文件夹

- 颜色工具: `_functions.scss`
- 模块外观: `modules/`
- 界面配色: `_appearance.scss`
- 文本配色: `_text.scss`

界面配色：
- 原生：`data-whisper-appearance="native"`（插件写入；配置 `appearance_light` / `appearance_dark` 为 `native`）
- 胭脂 / 石墨：Blush / Graphite（**默认方案，内置**；无属性或 `blush` / `graphite` 时生效，未安装插件也生效）

文本配色：
- 原生：`data-whisper-text="native"`（插件写入；配置 `text` 为 `native`，不附加 Whisper 文本样式）
- 虹彩：Rainbow（**默认方案，内置**；无属性或 `rainbow` 时生效，未安装插件也生效）

样式特性（顶层 boolean 配置；样式写在对应 `modules/` 文件，用属性选择器门控）：
- 文本半高背景：`text_half_bg`（默认 `true`）→ `data-whisper-text-half-bg`（**默认开启，内置**；`="false"` 时关闭）
- 隐藏文档面包屑：`hide_doc_breadcrumb`（默认 `false`）→ `data-whisper-hide-doc-breadcrumb="true"`（仅插件写入 `"true"` 时生效）

方法: 使用 JS（伴生插件「Whisper-Plus」）给根元素添加属性，然后使用属性选择器：

```scss
html[data-theme-mode="light"]:not([data-whisper-appearance="native"]) {
  // 界面配色（默认方案）
}
html[data-theme-mode="light"]:not([data-whisper-text="native"]) {
  // 文本配色（虹彩，默认方案）
}
html:not([data-whisper-text-half-bg="false"]) {
  // 样式特性：文本半高背景（默认开启）
}
```

- 内置配色: 精调配色
- 切换配色: 用跟 Asri 或 Savor 一样的动画 (ViewTransition)、配色模式要存储在工作空间中（不同步）
- 动态配色: 像 Asri 那种动态的颜色选择器
  p.s. 看到 Asri 用的方案是修改 html 元素的 style，感觉不够安全，第三方代码修改 style 时可能没有考虑到保留原来的样式而直接覆盖掉
