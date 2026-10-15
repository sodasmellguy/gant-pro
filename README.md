# gantt-pro 跨框架甘特图组件

> 更新日期：2026-09-27
> 仓库：`gantt-pro`（Monorepo，含 core / vue / react 三包）

## 项目简介

gantt-pro 是一个零第三方运行时依赖的跨框架甘特图组件库，采用 Monorepo 架构，核心逻辑完全框架无关，同时提供 Vue 3 和 React 适配层。

- **零依赖**：不引 dayjs / lodash / sortablejs / 任何 UI 框架，纯 CSS 变量主题
- **跨框架**：Core 逻辑层不依赖 Vue / React，双端 API 对齐
- **功能深度**：关键路径(CPM)、基准线对比、依赖顺推+环检测、撤销/重做等企业级功能

## 包结构

| 包名 | 说明 | 构建工具 |
|------|------|----------|
| `@gantt-pro/core` | 框架无关核心层（引擎 + 几何 + 日期 + 类型 + 导出） | tsup |
| `@gantt-pro/vue` | Vue 3 适配层 | vite (lib) |
| `@gantt-pro/react` | React 18+ 适配层 | tsup |

## 快速开始

### Vue 3

```bash
pnpm add @gantt-pro/vue @gantt-pro/core
```

```vue
<template>
  <GanttChart :data="tasks" :links="links" scale="day" />
</template>

<script setup lang="ts">
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  { id: 't1', name: '任务A', startDate: '2025-01-01', endDate: '2025-01-05', progress: 80 },
  { id: 't2', name: '任务B', startDate: '2025-01-06', endDate: '2025-01-10', progress: 40 },
]
const links: GanttLink[] = [{ from: 't1', to: 't2', type: 'fs' }]
</script>
```

### React

```bash
pnpm add @gantt-pro/react @gantt-pro/core
```

```tsx
import { GanttChart } from '@gantt-pro/react'
import '@gantt-pro/react/style.css'
import type { GanttTask, GanttLink } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  { id: 't1', name: 'Task A', startDate: '2025-01-01', endDate: '2025-01-05', progress: 80 },
]
const links: GanttLink[] = []

export function App() {
  return <GanttChart data={tasks} links={links} scale="day" />
}
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建（全部）
pnpm build

# 单独构建
pnpm build:core    # @gantt-pro/core
pnpm build:vue     # @gantt-pro/vue
pnpm build:react   # @gantt-pro/react

# 运行示例
pnpm dev:vue       # Vue demo
pnpm dev:react     # React demo

# 测试
pnpm test          # 全部
pnpm test:core     # core 测试
pnpm test:vue      # vue 测试
pnpm test:react    # react 测试
```

## 目录结构

```
gantt-pro/
├── package.json              # 根脚本编排
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── tsconfig.base.json        # 共享 TS 基础配置
├── docs/                     # 项目文档
├── examples/                 # 示例项目
│   ├── vue-demo/             #   Vue 3 Demo
│   └── react-demo/           #   React Demo
└── packages/                 # 源码包
    ├── core/                 # @gantt-pro/core — 框架无关核心层
    │   └── src/
    │       ├── index.ts      #   统一导出
    │       ├── reactive.ts   #   Signal / Computed / batch / effect
    │       ├── ganttEngine.ts#   GanttEngine 引擎（数据树/刻度/几何/拖拽/依赖/撤销）
    │       ├── geometry.ts   #   刻度生成/坐标换算/条形几何/连线路径
    │       ├── criticalPath.ts # CPM 关键路径算法
    │       ├── reschedule.ts #   依赖顺推算法
    │       ├── types.ts     #   类型定义
    │       ├── date.ts      #   日期工具
    │       ├── workCalendar.ts # 工作日历
    │       └── exporter.ts  #   导出工具（PNG/CSV/JSON）
    ├── vue/                  # @gantt-pro/vue — Vue 3 适配层
    │   └── src/
    │       ├── GanttChart.vue #  主组件
    │       ├── TaskBar.vue   #   任务条组件
    │       ├── LinkLayer.vue #   连线层组件
    │       ├── store.ts     #   Vue 响应式桥接层
    │       ├── GanttSync.ts  #   多图联动
    │       └── gantt.css    #   样式
    └── react/               # @gantt-pro/react — React 适配层
        └── src/
            ├── GanttChart.tsx #  主组件
            ├── TaskBar.tsx   #   任务条组件
            ├── LinkLayer.tsx #   连线层组件
            ├── useGanttStore.ts # React Store Hook
            ├── context.ts   #   Context
            └── gantt.css    #   样式
```

## License

MIT
