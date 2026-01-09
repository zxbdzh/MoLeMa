# 摸鱼软件 - 项目文档

## 项目概述

**摸鱼软件** 是一款基于 Electron + React + TypeScript 的桌面应用程序，旨在帮助用户通过全局快捷键快速查看技术文章、管理笔记和待办事项。该应用具有现代化的 UI 设计，支持多种功能模块，并提供流畅的动画效果。

### 主要技术栈

- **框架**: Electron 31.3.1
- **前端**: React 18.3.1 + TypeScript 5.5.2
- **构建工具**: Vite 5.3.1 + electron-vite 2.3.0
- **UI 框架**: Tailwind CSS 3.4.19
- **动画库**: Framer Motion 12.24.10, GSAP 3.14.2, Anime.js 4.2.2
- **3D 渲染**: Three.js 0.182.0 + React Three Fiber 9.5.0
- **状态管理**: Zustand 4.5.2
- **数据存储**: electron-store 8.2.0
- **RSS 解析**: rss-parser 3.13.0
- **UI 组件库**: Radix UI, Headless UI, Lucide React, Phosphor React

### 核心功能

1. **RSS 订阅管理** - 订阅技术博客，实时获取最新文章
2. **记事本** - 快速记录想法和笔记
3. **Todo List** - 管理任务和待办事项
4. **新闻资讯** - 浏览最新的技术新闻和资讯
5. **全局快捷键** - 使用快捷键快速显示/隐藏窗口（默认 Ctrl+Alt+M）
6. **自定义设置** - 快捷键配置、数据存储路径、界面效果设置

## 项目结构

```
moyu/
├── electron/
│   ├── main.ts           # Electron 主进程
│   └── preload.ts        # 预加载脚本
├── src/
│   ├── main/             # 主进程源码（空）
│   ├── preload/          # 预加载源码（空）
│   └── renderer/         # 渲染进程源码
│       ├── App.tsx       # 主应用组件
│       ├── main.tsx      # 渲染进程入口
│       ├── index.html    # HTML 模板
│       ├── components/   # UI 组件
│       │   ├── 3DCard.tsx
│       │   ├── AnimatedButton.tsx
│       │   ├── AnimatedCard.tsx
│       │   ├── ArticleReader.tsx
│       │   ├── LoadingSpinner.tsx
│       │   ├── News.tsx
│       │   ├── Notes.tsx
│       │   ├── ParticleBackground.tsx
│       │   ├── RSSPage.tsx
│       │   ├── Settings.tsx
│       │   ├── StarBackground.tsx
│       │   └── TodoList.tsx
│       ├── store/        # Zustand 状态管理
│       │   ├── notesStore.ts
│       │   ├── rssStore.ts
│       │   └── todoStore.ts
│       └── styles/       # 样式文件
│           └── globals.css
├── out/                  # 编译输出目录
├── resources/
│   └── icon.png         # 应用图标
├── electron.vite.config.ts  # Electron Vite 配置
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── postcss.config.js
```

## 构建和运行

### 开发模式

```bash
npm run dev
```

启动开发服务器，应用会自动打开并连接到 Vite 开发服务器（默认 http://localhost:5173）。

### 构建生产版本

```bash
npm run build
```

构建应用，输出到 `dist/` 和 `dist-electron/` 目录。

### 打包应用

```bash
npm run dist
```

使用 electron-builder 打包应用，输出到 `release/` 目录。

### 预览构建

```bash
npm run preview
```

预览构建后的应用。

### 打包到目录（不构建安装包）

```bash
npm run pack
```

将应用打包到目录，不创建安装包。

## 开发规范

### 代码风格

- 使用 TypeScript 进行类型检查
- 严格模式已启用（`strict: true`）
- 使用 ESLint 规则检查未使用的变量和参数
- 代码格式化遵循项目现有风格

### 组件开发

- 使用函数式组件和 Hooks
- 使用 Framer Motion 进行动画效果
- 使用 Tailwind CSS 进行样式设计
- 组件使用 PascalCase 命名
- 文件名使用 PascalCase 命名（如 `TodoList.tsx`）

### 状态管理

- 使用 Zustand 进行全局状态管理
- 使用 `persist` 中间件持久化状态
- Store 文件放在 `src/renderer/store/` 目录

### IPC 通信

- 主进程和渲染进程通过 IPC 通信
- IPC 处理程序定义在 `electron/main.ts`
- 预加载脚本在 `electron/preload.ts`
- 渲染进程通过 `window.electronAPI` 访问 IPC 接口

### 数据存储

- 使用 `electron-store` 进行数据持久化
- 数据存储在用户数据目录的 `moyu-data.json` 文件
- 支持自定义存储路径（在设置中配置）

### 路径别名

项目配置了以下路径别名：

- `@/*` → `src/*`
- `@main/*` → `src/main/*`
- `@preload/*` → `src/preload/*`
- `@renderer/*` → `src/renderer/*`

## 主要模块说明

### RSS 订阅模块

- **组件**: `RSSPage.tsx`, `ArticleReader.tsx`
- **Store**: `rssStore.ts`
- **功能**:
  - 添加/删除 RSS 源
  - 刷新 RSS 源
  - 查看文章列表
  - 收藏文章
  - 预设 RSS 源（阮一峰、掘金、Hacker News 等）

### Todo List 模块

- **组件**: `TodoList.tsx`
- **Store**: `todoStore.ts`
- **功能**:
  - 添加/删除任务
  - 标记任务完成
  - 编辑任务
  - 清除已完成任务
  - 统计信息展示

### 记事本模块

- **组件**: `Notes.tsx`
- **Store**: `notesStore.ts`
- **功能**:
  - 创建/编辑笔记
  - Markdown 支持
  - 笔记管理

### 新闻资讯模块

- **组件**: `News.tsx`
- **功能**:
  - 聚合国内新闻源
  - 分类浏览（科技、新闻、创业）
  - 实时更新

### 设置模块

- **组件**: `Settings.tsx`
- **功能**:
  - 自定义全局快捷键
  - 配置数据存储路径
  - 界面效果设置（打字特效等）

## Electron 主进程功能

### 窗口管理

- 创建无边框窗口
- 窗口最小化/最大化/关闭
- 全屏切换
- 窗口显示/隐藏切换

### 系统托盘

- 创建系统托盘图标
- 托盘菜单（显示/隐藏窗口、关于、退出）
- 双击托盘图标显示/隐藏窗口

### 全局快捷键

- 注册全局快捷键（默认 Ctrl+Alt+M）
- 动态更新快捷键
- 快捷键变更通知渲染进程

### IPC 处理程序

- `rss:*` - RSS 相关操作
- `shortcuts:*` - 快捷键管理
- `store:*` - 数据存储操作
- `dialog:*` - 对话框操作
- 窗口控制 IPC（toggle-window, minimize-window, maximize-window, close-window）

## 依赖说明

### 核心依赖

- `electron` - 桌面应用框架
- `react` / `react-dom` - UI 框架
- `typescript` - 类型系统
- `vite` - 构建工具
- `tailwindcss` - CSS 框架

### 功能依赖

- `electron-store` - 数据持久化
- `rss-parser` - RSS 解析
- `zustand` - 状态管理
- `framer-motion` - 动画库
- `three.js` / `@react-three/fiber` - 3D 渲染
- `date-fns` - 日期处理
- `zod` - 数据验证

### UI 组件库

- `@radix-ui/*` - 无障碍 UI 组件
- `@headlessui/react` - 无样式 UI 组件
- `lucide-react` - 图标库
- `phosphor-react` - 图标库

## 注意事项

1. **开发模式**: 开发时会自动连接到 Vite 开发服务器，生产模式下加载本地文件
2. **数据存储**: 所有数据存储在用户数据目录，可通过设置更改路径
3. **快捷键**: 更改快捷键后需要保存才能生效
4. **窗口控制**: 关闭窗口会隐藏到系统托盘，而不是真正退出应用
5. **构建输出**: 构建产物输出到 `dist/` 和 `dist-electron/` 目录
6. **打包输出**: 打包后的应用输出到 `release/{version}/` 目录

## 常见问题

### 如何添加新的 RSS 源？

在 RSS 订阅页面，点击预设源或输入自定义 RSS URL 添加。

### 如何更改全局快捷键？

在设置页面，点击快捷键按钮，按下新的快捷键组合，然后保存。

### 数据存储在哪里？

默认存储在用户数据目录的 `moyu-data.json` 文件中，可在设置中更改路径。

### 如何调试应用？

开发模式下会自动打开 DevTools，也可以使用快捷键打开。

### 如何打包应用？

运行 `npm run dist` 即可打包应用，输出到 `release/` 目录。

## 许可证

MIT License