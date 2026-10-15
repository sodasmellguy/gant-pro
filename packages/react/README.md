# @gantt-pro/react

> React 18+ Gantt chart component — zero third-party runtime dependencies, enterprise-grade features, out of the box.

> React 18+ 甘特图组件 — 零第三方运行时依赖，企业级功能，开箱即用。

[![npm version](https://img.shields.io/npm/v/@gantt-pro/react)](https://www.npmjs.com/package/@gantt-pro/react)
[![license](https://img.shields.io/npm/l/@gantt-pro/react)](./LICENSE)

## English

### Introduction

`@gantt-pro/react` is the React 18+ adapter for the **gantt-pro** Gantt chart component. Built on top of [`@gantt-pro/core`](https://www.npmjs.com/package/@gantt-pro/core), it provides a fully-featured `<GanttChart>` component with **zero third-party runtime dependencies** — no dayjs, no lodash, no sortablejs.

The API is fully aligned with the Vue version ([`@gantt-pro/vue`](https://www.npmjs.com/package/@gantt-pro/vue)), so you can switch between Vue and React without rewriting business logic.

### Installation

```bash
# pnpm (recommended)
pnpm add @gantt-pro/react @gantt-pro/core

# or npm
npm install @gantt-pro/react @gantt-pro/core

# or yarn
yarn add @gantt-pro/react @gantt-pro/core
```

> `@gantt-pro/core` is a peer dependency — it provides type definitions and utility functions.

### Quick Start

```tsx
import { useState } from 'react'
import { GanttChart } from '@gantt-pro/react'
import '@gantt-pro/react/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

const initialTasks: GanttTask[] = [
  {
    id: 'p1',
    name: 'Phase 1',
    children: [
      { id: 't1', name: 'Requirements', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: 'Alice' },
      { id: 't2', name: 'Design', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60, owner: 'Bob' },
      { id: 'm1', name: 'Design Review', startDate: '2025-01-13', milestone: true },
    ],
  },
]

const initialLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 'm1', type: 'fs' },
]

const columns: GanttColumn[] = [
  { key: 'name', label: 'Task Name', width: 220 },
  { key: 'startDate', label: 'Start', width: 88, align: 'center' },
  { key: 'endDate', label: 'End', width: 88, align: 'center' },
  { key: 'progress', label: 'Progress', width: 70, align: 'center' },
]

export default function App() {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks)
  const [links, setLinks] = useState<GanttLink[]>(initialLinks)

  return (
    <div style={{ height: 400 }}>
      <GanttChart
        data={tasks}
        links={links}
        columns={columns}
        scale="day"
        rowHeight={36}
        barHeight={24}
        onDataChange={setTasks}
        onLinksChange={setLinks}
      />
    </div>
  )
}
```

> **Important:** Don't forget to import the stylesheet: `import '@gantt-pro/react/style.css'`

### Advanced Features

```tsx
<GanttChart
  data={tasks}
  links={links}
  showBaseline          // Baseline comparison
  showCriticalPath      // Critical path highlight (CPM)
  autoReschedule        // Dependency rescheduling
  editable              // Inline editing
  rowDraggable          // Row drag-and-drop sorting
  showCheckbox          // Checkbox selection
  contextMenu           // Right-click menu
  levelColor            // Hierarchy row colors
  linkedResize          // Parent-child linked resize
  snap                  // Snap alignment
  offScreenIndicator    // Off-screen task indicator
  theme="purple"
  dark
/>
```

### Ref Methods

```tsx
import { useRef } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

export default function App() {
  const ref = useRef<GanttRef>(null)

  return (
    <div>
      <button onClick={() => ref.current?.undo()}>Undo</button>
      <button onClick={() => ref.current?.redo()}>Redo</button>
      <button onClick={() => ref.current?.scrollToToday()}>Scroll to Today</button>
      <button onClick={() => ref.current?.exportData({ format: 'png' })}>Export PNG</button>
      <div style={{ height: 400 }}>
        <GanttChart ref={ref} data={tasks} />
      </div>
    </div>
  )
}
```

### Custom Rendering (Render Props)

```tsx
<GanttChart
  data={tasks}
  barSlot
  renderBarContent={(task, geom, progress) => (
    <div style={{ padding: '0 4px', fontSize: 12 }}>
      {task.name} — {progress}%
    </div>
  )}
  renderCell={(task, columnKey, value) => (
    <span style={{ color: columnKey === 'progress' && Number(value) < 50 ? 'red' : 'inherit' }}>
      {value}
    </span>
  )}
  renderHeader={(column) => (
    <strong>{column.label}</strong>
  )}
/>
```

### Key Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `GanttTask[]` | — | Task tree (required) |
| `links` | `GanttLink[]` | `[]` | Dependency links |
| `columns` | `GanttColumn[]` | — | Left table columns |
| `scale` | `ScaleType` | `'day'` | Time scale: hour/day/week/month/quarter/year |
| `rowHeight` | `number` | `36` | Row height (px) |
| `barHeight` | `number` | `24` | Bar height (px) |
| `readonly` | `boolean` | `false` | Disable drag and link creation |
| `showCriticalPath` | `boolean` | `false` | Highlight critical path (CPM) |
| `autoReschedule` | `boolean` | `false` | Auto-propagate dependency changes |
| `editable` | `boolean` | `false` | Inline editing on double-click |
| `rowDraggable` | `boolean` | `false` | Row drag-and-drop sorting |
| `showBaseline` | `boolean` | `false` | Baseline comparison |
| `dark` | `boolean` | `false` | Dark mode |
| `theme` | `'blue'\|'green'\|'purple'\|'orange'` | `'blue'` | Theme preset |
| `locale` | `'zh-CN'\|'en-US'` | `'zh-CN'` | i18n locale |
| `snap` | `boolean\|SnapConfig` | `false` | Snap alignment |
| `contextMenu` | `boolean\|function` | `false` | Right-click menu |
| `zoomOnWheel` | `boolean` | `true` | Ctrl+wheel zoom |
| `showToday` | `boolean` | `true` | Today line |
| `showWeekend` | `boolean` | `true` | Weekend background |
| `onDataChange` | `(data) => void` | — | Data change callback |
| `onLinksChange` | `(links) => void` | — | Links change callback |
| `onTaskChange` | `(payload) => void` | — | Task change callback |
| `onRowClick` | `(task) => void` | — | Row click callback |
| `renderBarContent` | `function` | — | Custom bar content renderer |
| `renderCell` | `function` | — | Custom cell renderer |
| `renderHeader` | `function` | — | Custom header renderer |

### Ref Methods

| Method | Description |
|---|---|
| `undo()` | Undo last operation |
| `redo()` | Redo next operation |
| `scrollToToday()` | Scroll viewport to today |
| `scrollToTask(id)` | Scroll to a specific task |
| `jumpToDate(date)` | Jump to a specific date |
| `exportData({ format })` | Export to PNG/CSV/JSON |
| `print()` | Print the chart |
| `getSelected()` | Get selected task IDs |
| `selectAll(value)` | Select/deselect all tasks |

### Documentation

- [Full Docs](Stay tuned)
- [API Reference](Stay tuned)
- [Live Demo](Stay tuned)

### License

MIT

---

## 中文

### 简介

`@gantt-pro/react` 是 **gantt-pro** 甘特图组件的 React 18+ 适配层。基于 [`@gantt-pro/core`](https://www.npmjs.com/package/@gantt-pro/core) 构建，提供功能完整的 `<GanttChart>` 组件，**零第三方运行时依赖** — 不依赖 dayjs、lodash、sortablejs。

API 与 Vue 版（[`@gantt-pro/vue`](https://www.npmjs.com/package/@gantt-pro/vue)）完全对齐，切换框架无需重写业务代码。

### 安装

```bash
# pnpm（推荐）
pnpm add @gantt-pro/react @gantt-pro/core

# 或 npm
npm install @gantt-pro/react @gantt-pro/core

# 或 yarn
yarn add @gantt-pro/react @gantt-pro/core
```

> `@gantt-pro/core` 是 peer dependency，提供类型定义和工具函数。

### 快速开始

```tsx
import { useState } from 'react'
import { GanttChart } from '@gantt-pro/react'
import '@gantt-pro/react/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

const initialTasks: GanttTask[] = [
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: '张三' },
      { id: 't2', name: '详细设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60, owner: '李四' },
      { id: 'm1', name: '设计评审', startDate: '2025-01-13', milestone: true },
    ],
  },
]

const initialLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 'm1', type: 'fs' },
]

const columns: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 220 },
  { key: 'startDate', label: '开始', width: 88, align: 'center' },
  { key: 'endDate', label: '结束', width: 88, align: 'center' },
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]

export default function App() {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks)
  const [links, setLinks] = useState<GanttLink[]>(initialLinks)

  return (
    <div style={{ height: 400 }}>
      <GanttChart
        data={tasks}
        links={links}
        columns={columns}
        scale="day"
        rowHeight={36}
        barHeight={24}
        onDataChange={setTasks}
        onLinksChange={setLinks}
      />
    </div>
  )
}
```

> **重要：** 别忘了引入样式文件：`import '@gantt-pro/react/style.css'`

### 高级功能

```tsx
<GanttChart
  data={tasks}
  links={links}
  showBaseline          // 基准线对比
  showCriticalPath      // 关键路径高亮 (CPM)
  autoReschedule        // 依赖顺推
  editable              // 行内编辑
  rowDraggable          // 行拖拽排序
  showCheckbox          // Checkbox 多选
  contextMenu           // 右键菜单
  levelColor            // 层级行背景色
  linkedResize          // 父子联动缩放
  snap                  // 吸附对齐
  offScreenIndicator    // 视口外定位指示器
  theme="purple"
  dark
/>
```

### 通过 ref 调用方法

```tsx
import { useRef } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

export default function App() {
  const ref = useRef<GanttRef>(null)

  return (
    <div>
      <button onClick={() => ref.current?.undo()}>撤销</button>
      <button onClick={() => ref.current?.redo()}>重做</button>
      <button onClick={() => ref.current?.scrollToToday()}>回到今天</button>
      <button onClick={() => ref.current?.exportData({ format: 'png' })}>导出图片</button>
      <div style={{ height: 400 }}>
        <GanttChart ref={ref} data={tasks} />
      </div>
    </div>
  )
}
```

### 自定义渲染（Render Props）

```tsx
<GanttChart
  data={tasks}
  barSlot
  renderBarContent={(task, geom, progress) => (
    <div style={{ padding: '0 4px', fontSize: 12 }}>
      {task.name} — {progress}%
    </div>
  )}
  renderCell={(task, columnKey, value) => (
    <span style={{ color: columnKey === 'progress' && Number(value) < 50 ? 'red' : 'inherit' }}>
      {value}
    </span>
  )}
  renderHeader={(column) => (
    <strong>{column.label}</strong>
  )}
/>
```

### 主要 Props

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `data` | `GanttTask[]` | — | 任务树（必填） |
| `links` | `GanttLink[]` | `[]` | 依赖连线 |
| `columns` | `GanttColumn[]` | — | 左侧表格列配置 |
| `scale` | `ScaleType` | `'day'` | 时间刻度：hour/day/week/month/quarter/year |
| `rowHeight` | `number` | `36` | 行高 (px) |
| `barHeight` | `number` | `24` | 条形高 (px) |
| `readonly` | `boolean` | `false` | 只读模式 |
| `showCriticalPath` | `boolean` | `false` | 关键路径高亮 (CPM) |
| `autoReschedule` | `boolean` | `false` | 依赖自动顺推 |
| `editable` | `boolean` | `false` | 行内编辑 |
| `rowDraggable` | `boolean` | `false` | 行拖拽排序 |
| `showBaseline` | `boolean` | `false` | 基准线对比 |
| `dark` | `boolean` | `false` | 暗色模式 |
| `theme` | `'blue'\|'green'\|'purple'\|'orange'` | `'blue'` | 主题预设 |
| `locale` | `'zh-CN'\|'en-US'` | `'zh-CN'` | 国际化 |
| `snap` | `boolean\|SnapConfig` | `false` | 吸附对齐 |
| `contextMenu` | `boolean\|function` | `false` | 右键菜单 |
| `zoomOnWheel` | `boolean` | `true` | Ctrl+滚轮缩放 |
| `showToday` | `boolean` | `true` | 今日线 |
| `showWeekend` | `boolean` | `true` | 周末背景 |
| `onDataChange` | `(data) => void` | — | 数据变更回调 |
| `onLinksChange` | `(links) => void` | — | 连线变更回调 |
| `onTaskChange` | `(payload) => void` | — | 任务变更回调 |
| `onRowClick` | `(task) => void` | — | 行点击回调 |
| `renderBarContent` | `function` | — | 自定义条形内容渲染 |
| `renderCell` | `function` | — | 自定义单元格渲染 |
| `renderHeader` | `function` | — | 自定义表头渲染 |

### Ref 方法

| 方法 | 说明 |
|---|---|
| `undo()` | 撤销 |
| `redo()` | 重做 |
| `scrollToToday()` | 滚动到今天 |
| `scrollToTask(id)` | 滚动到指定任务 |
| `jumpToDate(date)` | 跳转到指定日期 |
| `exportData({ format })` | 导出 PNG/CSV/JSON |
| `print()` | 打印 |
| `getSelected()` | 获取选中任务 ID |
| `selectAll(value)` | 全选/取消全选 |

### 文档

- [完整文档](敬请期待)
- [API 参考](敬请期待)
- [在线演示](敬请期待)

### 开源协议

MIT
