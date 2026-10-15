# @gantt-pro/vue

> Vue 3 Gantt chart component — zero third-party runtime dependencies, enterprise-grade features, out of the box.

> Vue 3 甘特图组件 — 零第三方运行时依赖，企业级功能，开箱即用。

[![npm version](https://img.shields.io/npm/v/@gantt-pro/vue)](https://www.npmjs.com/package/@gantt-pro/vue)
[![license](https://img.shields.io/npm/l/@gantt-pro/vue)](./LICENSE)

## English

### Introduction

`@gantt-pro/vue` is the Vue 3 adapter for the **gantt-pro** Gantt chart component. Built on top of [`@gantt-pro/core`](https://www.npmjs.com/package/@gantt-pro/core), it provides a fully-featured `<GanttChart>` component with **zero third-party runtime dependencies** — no dayjs, no lodash, no sortablejs.

### Installation

```bash
# pnpm (recommended)
pnpm add @gantt-pro/vue @gantt-pro/core

# or npm
npm install @gantt-pro/vue @gantt-pro/core

# or yarn
yarn add @gantt-pro/vue @gantt-pro/core
```

> `@gantt-pro/core` is a peer dependency — it provides type definitions and utility functions.

### Quick Start

```vue
<template>
  <div style="height: 400px;">
    <GanttChart
      :data="tasks"
      :links="links"
      :columns="columns"
      scale="day"
      :row-height="36"
      :bar-height="24"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

const tasks = ref<GanttTask[]>([
  {
    id: 'p1',
    name: 'Phase 1',
    children: [
      { id: 't1', name: 'Requirements', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: 'Alice' },
      { id: 't2', name: 'Design', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60, owner: 'Bob' },
      { id: 'm1', name: 'Design Review', startDate: '2025-01-13', milestone: true },
    ],
  },
])

const links = ref<GanttLink[]>([
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 'm1', type: 'fs' },
])

const columns: GanttColumn[] = [
  { key: 'name', label: 'Task Name', width: 220 },
  { key: 'startDate', label: 'Start', width: 88, align: 'center' },
  { key: 'endDate', label: 'End', width: 88, align: 'center' },
  { key: 'progress', label: 'Progress', width: 70, align: 'center' },
]
</script>
```

> **Important:** Don't forget to import the stylesheet: `import '@gantt-pro/vue/style.css'`

### Two-Way Binding

Supports `v-model:data`, `v-model:scale`, and `v-model:links`:

```vue
<template>
  <GanttChart
    v-model:data="tasks"
    v-model:scale="scale"
    v-model:links="links"
  />
</template>
```

### Advanced Features

```vue
<template>
  <GanttChart
    :data="tasks"
    :links="links"
    :show-baseline="true"          <!-- Baseline comparison -->
    :show-critical-path="true"     <!-- Critical path highlight -->
    :auto-reschedule="true"        <!-- Dependency rescheduling -->
    :editable="true"               <!-- Inline editing -->
    :row-draggable="true"          <!-- Row drag-and-drop sorting -->
    :show-checkbox="true"          <!-- Checkbox selection -->
    :context-menu="true"           <!-- Right-click menu -->
    :level-color="true"            <!-- Hierarchy row colors -->
    :linked-resize="true"          <!-- Parent-child linked resize -->
    :snap="true"                   <!-- Snap alignment -->
    :off-screen-indicator="true"   <!-- Off-screen task indicator -->
    theme="purple"
    dark
  />
</template>
```

### Ref Methods

```vue
<template>
  <div>
    <button @click="ganttRef?.undo()">Undo</button>
    <button @click="ganttRef?.redo()">Redo</button>
    <button @click="ganttRef?.scrollToToday()">Scroll to Today</button>
    <button @click="exportPNG">Export PNG</button>
    <GanttChart ref="ganttRef" :data="tasks" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()

function exportPNG() {
  ganttRef.value?.exportData({ format: 'png' })
}
</script>
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
| `theme` | `'blue'|'green'|'purple'|'orange'` | `'blue'` | Theme preset |
| `locale` | `'zh-CN'|'en-US'` | `'zh-CN'` | i18n locale |
| `snap` | `boolean|SnapConfig` | `false` | Snap alignment |
| `contextMenu` | `boolean|function` | `false` | Right-click menu |
| `zoomOnWheel` | `boolean` | `true` | Ctrl+wheel zoom |
| `showToday` | `boolean` | `true` | Today line |
| `showWeekend` | `boolean` | `true` | Weekend background |

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

### Multi-Chart Sync

```typescript
import { createGanttSyncHub } from '@gantt-pro/vue'

const hub = createGanttSyncHub({
  scroll: true,
  scale: true,
  selection: true,
  expand: true,
})

// Register multiple GanttChart instances via ref
hub.add(ganttRef1.value!)
hub.add(ganttRef2.value!)
```

### Documentation

- [Full Docs](Stay tuned)
- [API Reference](Stay tuned)
- [Live Demo](Stay tuned)

### License

MIT

---

## 中文

### 简介

`@gantt-pro/vue` 是 **gantt-pro** 甘特图组件的 Vue 3 适配层。基于 [`@gantt-pro/core`](https://www.npmjs.com/package/@gantt-pro/core) 构建，提供功能完整的 `<GanttChart>` 组件，**零第三方运行时依赖** — 不依赖 dayjs、lodash、sortablejs。

### 安装

```bash
# pnpm（推荐）
pnpm add @gantt-pro/vue @gantt-pro/core

# 或 npm
npm install @gantt-pro/vue @gantt-pro/core

# 或 yarn
yarn add @gantt-pro/vue @gantt-pro/core
```

> `@gantt-pro/core` 是 peer dependency，提供类型定义和工具函数。

### 快速开始

```vue
<template>
  <div style="height: 400px;">
    <GanttChart
      :data="tasks"
      :links="links"
      :columns="columns"
      scale="day"
      :row-height="36"
      :bar-height="24"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

const tasks = ref<GanttTask[]>([
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: '张三' },
      { id: 't2', name: '详细设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60, owner: '李四' },
      { id: 'm1', name: '设计评审', startDate: '2025-01-13', milestone: true },
    ],
  },
])

const links = ref<GanttLink[]>([
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 'm1', type: 'fs' },
])

const columns: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 220 },
  { key: 'startDate', label: '开始', width: 88, align: 'center' },
  { key: 'endDate', label: '结束', width: 88, align: 'center' },
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]
</script>
```

> **重要：** 别忘了引入样式文件：`import '@gantt-pro/vue/style.css'`

### 双向绑定

支持 `v-model:data`、`v-model:scale`、`v-model:links`：

```vue
<template>
  <GanttChart
    v-model:data="tasks"
    v-model:scale="scale"
    v-model:links="links"
  />
</template>
```

### 高级功能

```vue
<template>
  <GanttChart
    :data="tasks"
    :links="links"
    :show-baseline="true"          <!-- 基准线对比 -->
    :show-critical-path="true"     <!-- 关键路径高亮 -->
    :auto-reschedule="true"        <!-- 依赖顺推 -->
    :editable="true"               <!-- 行内编辑 -->
    :row-draggable="true"          <!-- 行拖拽排序 -->
    :show-checkbox="true"          <!-- Checkbox 多选 -->
    :context-menu="true"           <!-- 右键菜单 -->
    :level-color="true"            <!-- 层级行背景色 -->
    :linked-resize="true"          <!-- 父子联动缩放 -->
    :snap="true"                   <!-- 吸附对齐 -->
    :off-screen-indicator="true"   <!-- 视口外定位指示器 -->
    theme="purple"
    dark
  />
</template>
```

### 通过 ref 调用方法

```vue
<template>
  <div>
    <button @click="ganttRef?.undo()">撤销</button>
    <button @click="ganttRef?.redo()">重做</button>
    <button @click="ganttRef?.scrollToToday()">回到今天</button>
    <button @click="exportPNG">导出图片</button>
    <GanttChart ref="ganttRef" :data="tasks" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()

function exportPNG() {
  ganttRef.value?.exportData({ format: 'png' })
}
</script>
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
| `theme` | `'blue'|'green'|'purple'|'orange'` | `'blue'` | 主题预设 |
| `locale` | `'zh-CN'|'en-US'` | `'zh-CN'` | 国际化 |
| `snap` | `boolean|SnapConfig` | `false` | 吸附对齐 |
| `contextMenu` | `boolean|function` | `false` | 右键菜单 |
| `zoomOnWheel` | `boolean` | `true` | Ctrl+滚轮缩放 |
| `showToday` | `boolean` | `true` | 今日线 |
| `showWeekend` | `boolean` | `true` | 周末背景 |

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

### 多图联动

```typescript
import { createGanttSyncHub } from '@gantt-pro/vue'

const hub = createGanttSyncHub({
  scroll: true,    // 同步滚动
  scale: true,     // 同步缩放
  selection: true, // 同步选择
  expand: true,    // 同步展开/折叠
})

// 通过 ref 注册多个 GanttChart 实例
hub.add(ganttRef1.value!)
hub.add(ganttRef2.value!)
```

### 文档

- [完整文档](敬请期待)
- [API 参考](敬请期待)
- [在线演示](敬请期待)

### 开源协议

MIT
