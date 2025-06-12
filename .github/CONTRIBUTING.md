## 开发指南

### 环境准备

确保已安装 Node.js 和 pnpm，然后安装依赖：

```bash
pnpm install
```

### 开发

开发时可以使用以下命令，它会自动监视文件变化并重新构建 TypeScript 和 SCSS：

```bash
pnpm run dev
```

### 构建

构建生产版本：

```bash
pnpm run build
```

### 项目结构

- `src/`       - TypeScript 源代码
  - `modules/`    - 各功能模块
  - `types.ts`    - 类型定义
  - `theme.ts`    - 主入口文件
- `style/`     - SCSS 样式文件
  - `appearance/` - 主题的基本样式和配色
  - `module/`     - 各模块的样式
  - `text/`       - 文本相关样式
- `theme.js`   - 最终生成的主题脚本
- `theme.scss` - 主样式入口文件
- `theme.css`  - 最终生成的样式表
