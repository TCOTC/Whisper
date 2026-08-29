## 开发指南

### 环境准备

确保已安装 Node.js 和 pnpm，然后安装依赖：

```bash
pnpm install
```

### 开发

开发时可以使用以下命令，它会自动监视文件变化并重新构建 SCSS：

```bash
pnpm run dev
```

### 构建

构建生产版本：

```bash
pnpm run build
```

### 项目结构

- `src/`       - TypeScript 入口（仅引入 SCSS，主题的 JS 功能已迁移至「Whisper-Plus」插件）
  - `theme.ts`    - 主入口文件
- `styles/`    - SCSS 样式文件
  - `appearance/` - 主题的基本样式和配色
  - `modules/`    - 各模块的样式
  - `theme.scss`  - 主入口文件
- `theme.css`  - 最终生成的样式表
