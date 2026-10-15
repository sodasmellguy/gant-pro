# @gantt-pro/core

> Framework-agnostic Gantt chart core logic layer — zero runtime dependencies.

> 框架无关的甘特图核心逻辑层 — 零运行时依赖。

[![npm version](https://img.shields.io/npm/v/@gantt-pro/core)](https://www.npmjs.com/package/@gantt-pro/core)
[![license](https://img.shields.io/npm/l/@gantt-pro/core)](./LICENSE)

## English

### Introduction

`@gantt-pro/core` is the framework-agnostic core logic layer of the **gantt-pro** project. It contains all the essential Gantt chart logic — task management, dependency routing, critical path analysis (CPM), rescheduling, date utilities, work calendar, export tools, and a lightweight reactive system — with **zero third-party runtime dependencies** (no dayjs, no lodash, no React/Vue).

It is consumed by:
- [`@gantt-pro/vue`](https://www.npmjs.com/package/@gantt-pro/vue) — Vue 3 adapter
- [`@gantt-pro/react`](https://www.npmjs.com/package/@gantt-pro/react) — React 18+ adapter

### Installation

```bash
# pnpm (recommended)
pnpm add @gantt-pro/core

# or npm
npm install @gantt-pro/core

# or yarn
yarn add @gantt-pro/core
```

### Key Features

- **GanttEngine** — Central state management with built-in undo/redo history stack
- **Critical Path Method (CPM)** — Automatically compute critical path, highlight zero-float tasks
- **Dependency Rescheduling** — FS/SS/FF/SF link types with automatic downstream propagation and cycle detection
- **Geometry & Routing** — Bar width calculation, time-axis tick generation, weekend column detection, link path routing
- **Work Calendar** — Custom working days / holidays / make-up workdays, automatically excludes non-working days from duration calculations
- **Export Tools** — One-click export to PNG (2x resolution), CSV, JSON
- **Reactive Primitives** — Lightweight `signal` / `computed` / `effect` system (framework-agnostic reactivity)
- **Date Utilities** — Zero-dependency date arithmetic (addDays, diffDays, startOfWeek, isWeekend, etc.)
- **i18n** — Built-in zh-CN and en-US, fully customizable labels
- **TypeScript** — Full type declarations included

### Quick Example

```typescript
import { GanttEngine, type GanttTask, type GanttLink } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  {
    id: 'p1',
    name: 'Phase 1',
    children: [
      { id: 't1', name: 'Requirements', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
      { id: 't2', name: 'Design', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60 },
    ],
  },
]

const links: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
]

const engine = new GanttEngine({ data: tasks, links })

// Compute critical path
const criticalIds = engine.computeCriticalIds()

// Reschedule downstream tasks
engine.rescheduleFrom('t1')

// Export to CSV
import { exportCSV } from '@gantt-pro/core'
exportCSV(tasks)
```

### API Exports

| Export | Type | Description |
|---|---|---|
| `GanttEngine` | Class | Central state engine with undo/redo |
| `signal`, `computed`, `effect`, `batch` | Functions | Reactive primitives |
| `computeCriticalIds` | Function | Critical path analysis (CPM) |
| `rescheduleFrom`, `shiftTask` | Functions | Dependency-based rescheduling |
| `exportGantt`, `exportCSV`, `exportJSON`, `exportPNG` | Functions | Export utilities |
| `createWorkCalendar` | Function | Work calendar factory |
| `generateTopTicks`, `generateBottomTicks` | Functions | Time-axis tick generation |
| `routeLink` | Function | Dependency link path routing |
| `GanttTask`, `GanttLink`, `GanttColumn`, ... | Types | TypeScript type definitions |

### License

MIT

---

## 中文

### 简介

`@gantt-pro/core` 是 **gantt-pro** 项目的框架无关核心逻辑层。包含甘特图所需的全部核心逻辑 — 任务管理、依赖连线、关键路径分析（CPM）、依赖顺推、日期工具、工作日历、导出工具和轻量级响应式系统，**零第三方运行时依赖**（不依赖 dayjs、lodash、React/Vue）。

它被以下适配层消费：
- [`@gantt-pro/vue`](https://www.npmjs.com/package/@gantt-pro/vue) — Vue 3 适配层
- [`@gantt-pro/react`](https://www.npmjs.com/package/@gantt-pro/react) — React 18+ 适配层

### 安装

```bash
# pnpm（推荐）
pnpm add @gantt-pro/core

# 或 npm
npm install @gantt-pro/core

# 或 yarn
yarn add @gantt-pro/core
```

### 核心功能

- **GanttEngine** — 中央状态管理，内置 undo/redo 历史栈
- **关键路径法（CPM）** — 自动计算关键路径，高亮浮时为零的任务
- **依赖顺推** — 支持 FS/SS/FF/SF 四种依赖类型，自动顺推后续任务，内置环检测
- **几何与路由** — 条形宽度计算、时间轴刻度生成、周末列检测、连线路径路由
- **工作日历** — 自定义工作日/休息日/调休补班，计算工期时自动排除非工作日
- **导出工具** — 一键导出 PNG（2x 分辨率）、CSV、JSON
- **响应式原语** — 轻量级 `signal` / `computed` / `effect` 系统（框架无关的响应式）
- **日期工具** — 零依赖日期运算（addDays、diffDays、startOfWeek、isWeekend 等）
- **国际化** — 内置中英文，支持完全自定义标签
- **TypeScript** — 完整类型声明

### 快速示例

```typescript
import { GanttEngine, type GanttTask, type GanttLink } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  {
    id: 'p1',
    name: '阶段一',
    children: [
      { id: 't1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
      { id: 't2', name: '详细设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60 },
    ],
  },
]

const links: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
]

const engine = new GanttEngine({ data: tasks, links })

// 计算关键路径
const criticalIds = engine.computeCriticalIds()

// 顺推后续任务
engine.rescheduleFrom('t1')

// 导出 CSV
import { exportCSV } from '@gantt-pro/core'
exportCSV(tasks)
```

### 导出 API

| 导出 | 类型 | 说明 |
|---|---|---|
| `GanttEngine` | 类 | 中央状态引擎，支持 undo/redo |
| `signal`, `computed`, `effect`, `batch` | 函数 | 响应式原语 |
| `computeCriticalIds` | 函数 | 关键路径分析（CPM） |
| `rescheduleFrom`, `shiftTask` | 函数 | 依赖顺推 |
| `exportGantt`, `exportCSV`, `exportJSON`, `exportPNG` | 函数 | 导出工具 |
| `createWorkCalendar` | 函数 | 工作日历工厂 |
| `generateTopTicks`, `generateBottomTicks` | 函数 | 时间轴刻度生成 |
| `routeLink` | 函数 | 依赖线路由 |
| `GanttTask`, `GanttLink`, `GanttColumn`, ... | 类型 | TypeScript 类型定义 |

### 开源协议

MIT
