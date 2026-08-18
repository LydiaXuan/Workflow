# 谷歌商店优化助手

面向 Google Play 的应用商店优化（ASO）工作台，分为两大板块：

- **文案与关键词**：竞品文案采集、关键词分析、文案生成、更新日志、算法知识库。
- **商店图与素材**：商店素材（图标 / 置顶大图 / 宣传截图 / 活动图 / 素材变更）、截图识别。

界面已全面中文化，命名直白，操作精简。

## 本地运行

前置条件：Node.js。

1. 安装依赖：`npm install`（或 `bun install`）
2. 在 `.env.local` 中配置 `GEMINI_API_KEY`
3. 启动：`npm run dev`

## 常用脚本

- `npm run dev`：本地开发（前端 + 接口服务）
- `npm run build`：生产构建
- `npm run lint`：类型检查（`tsc --noEmit`）
