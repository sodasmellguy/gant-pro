# 安装引入

## 环境要求

| 要求 | 版本 |
|---|---|
| Node.js | >= 18 |
| Vue | 3.x（使用 `@gantt-pro/vue` 时） |
| React | 18+（使用 `@gantt-pro/react` 时） |
| 浏览器 | Chrome 88+ / Firefox 87+ / Safari 14+ |

## 包说明

| 包名 | 作用 | 依赖 |
|---|---|---|
| `@gantt-pro/core` | 框架无关核心层（引擎 + 几何 + 日期 + 类型 + 导出） | 无运行时依赖 |
| `@gantt-pro/vue` | Vue 3 适配层 | `@gantt-pro/core` + `vue` |
| `@gantt-pro/react` | React 18+ 适配层 | `@gantt-pro/core` + `react` |

::: tip
你**不需要**手动安装 `@gantt-pro/core`，安装 `@gantt-pro/vue` 或 `@gantt-pro/react` 时会自动安装。但如果要从 core 导入类型，需要确保它在 `dependencies` 中。
:::

---

## Vue 项目引入

### 方式一：包管理器安装（推荐）

```bash
# pnpm
pnpm add @gantt-pro/vue @gantt-pro/core

# npm
npm install @gantt-pro/vue @gantt-pro/core

# yarn
yarn add @gantt-pro/vue @gantt-pro/core
```

### 方式二：全局注册

适合在入口处一次性注册，之后所有 `.vue` 文件可直接使用 `<GanttChart>`：

```ts
// main.ts
import { createApp } from 'vue'
import GanttProVue from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import App from './App.vue'

const app = createApp(App)
app.use(GanttProVue)   // 注册 GanttChart 为全局组件
app.mount('#app')
```

```vue
<!-- App.vue — 全局注册后直接用，无需 import -->
<template>
  <GanttChart :data="tasks" scale="day" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { GanttTask } from '@gantt-pro/core'

const tasks = ref<GanttTask[]>([
  { id: '1', name: '任务', startDate: '2025-01-01', endDate: '2025-01-05' },
])
</script>
```

### 方式三：按需引入（推荐）

更好的 Tree-shaking 效果，只打包用到的组件：

```vue
<script setup lang="ts">
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask } from '@gantt-pro/core'
</script>
```

### 方式四：CDN 引入

不使用构建工具时，通过 CDN 直接引入：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gantt Demo</title>
  <link rel="stylesheet" href="https://unpkg.com/@gantt-pro/vue/dist/gantt.css">
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; }
    #app { height: 400px; }
  </style>
</head>
<body>
  <div id="app">
    <gantt-chart :data="tasks" scale="day" />
  </div>

  <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
  <script src="https://unpkg.com/@gantt-pro/core/dist/index.umd.js"></script>
  <script src="https://unpkg.com/@gantt-pro/vue/dist/index.umd.js"></script>
  <script>
    const { createApp, ref } = Vue

    createApp({
      setup() {
        const tasks = ref([
          {
            id: '1',
            name: '需求分析',
            startDate: '2025-01-01',
            endDate: '2025-01-05',
            progress: 50,
          }
        ])
        return { tasks }
      }
    })
    .component('GanttChart', GanttProVue.GanttChart)
    .mount('#app')
  </script>
</body>
</html>
```

---

## React 项目引入

### 方式一：包管理器安装

```bash
pnpm add @gantt-pro/react @gantt-pro/core
```

### 基本使用

```tsx
import { useState } from 'react'
import { GanttChart } from '@gantt-pro/react'
import '@gantt-pro/react/style.css'
import type { GanttTask } from '@gantt-pro/core'

export function App() {
  const [tasks, setTasks] = useState<GanttTask[]>([
    { id: '1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
  ])

  return (
    <div style={{ height: 400 }}>
      <GanttChart
        data={tasks}
        scale="day"
        onDataChange={setTasks}
      />
    </div>
  )
}
```

### 通过 ref 调用方法

```tsx
import { useRef, useCallback } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

export function App() {
  const ref = useRef<GanttRef>(null)

  const handleUndo = useCallback(() => {
    ref.current?.undo()
  }, [])

  const handleExport = useCallback(() => {
    ref.current?.exportData({ format: 'png' })
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button onClick={handleUndo}>撤销</button>
        <button onClick={() => ref.current?.scrollToToday()}>回到今天</button>
        <button onClick={handleExport}>导出 PNG</button>
      </div>
      <div style={{ height: 400 }}>
        <GanttChart ref={ref} data={tasks} />
      </div>
    </div>
  )
}
```

::: warning 必须设置容器高度
`GanttChart` 默认填充父容器高度。如果父容器没有高度，甘特图会塌缩为 0。请给外层 `div` 设置 `height` 或 `flex: 1`。
:::

---

## 从 Core 直接使用纯逻辑

如果你的场景不需要 UI 组件，只需要日期计算、工作日历、导出等工具函数，可以直接从 `@gantt-pro/core` 导入：

```ts
import {
  // 日期工具
  toDate, startOfDay, addDays, diffDays, fmt,
  startOfWeek, endOfWeek, startOfMonth, startOfQuarter,
  isWeekend, daysInMonth, addHours, diffHours,

  // 工作日历
  createWorkCalendar,

  // 导出工具
  exportGantt, exportCSV, exportJSON, exportPNG, downloadFile, flattenTasks,

  // 核心引擎
  GanttEngine,

  // 几何计算
  getPxPerDay, computeChartRange, createTimeConverter, barWidth,
  generateTopTicks, generateBottomTicks, generateWeekendCols, routeLink,

  // 关键路径
  computeCriticalIds,

  // 依赖顺推
  rescheduleFrom, shiftTask,

  // 响应式原语
  Signal, Computed, signal, computed, batch, effect,

  // 类型
  type GanttTask, type GanttLink, type ScaleType, type Geom, type Tick,
} from '@gantt-pro/core'

// ---- 示例 1：日期计算 ----
const d = toDate('2025-01-15')
const tomorrow = addDays(d, 1)
const diff = diffDays(d, tomorrow)  // 1
const formatted = fmt(d, 'YYYY-MM-DD')  // '2025-01-15'

// ---- 示例 2：工作日历 ----
const cal = createWorkCalendar({
  weekendDays: [0, 6],
  holidays: ['2025-01-01', '2025-01-29'],
  workdays: ['2025-01-25'],  // 调休补班
})
cal.isWorkday('2025-01-06')       // true（周一）
cal.isWorkday('2025-01-04')       // false（周六）
cal.isWorkday('2025-01-01')       // false（元旦）
cal.workdayCount('2025-01-06', '2025-01-10')  // 5
cal.addWorkdays('2025-01-06', 5)  // 2025-01-13

// ---- 示例 3：导出数据 ----
const tasks = [
  { id: '1', name: '任务', startDate: '2025-01-01', endDate: '2025-01-05', progress: 50 }
]
const csv = exportCSV(tasks)
console.log(csv)
// ID,名称,开始日期,结束日期,进度,负责人,里程碑
// 1,"任务",2025-01-01,2025-01-05,50,,否

// ---- 示例 4：核心引擎 ----
const engine = new GanttEngine(tasks, {
  scale: 'day',
  rowHeight: 36,
  barHeight: 24,
  readonly: false,
  allowLink: true,
  showBaseline: false,
  autoReschedule: false,
  filterOwner: null,
  showCriticalPath: false,
  hourWidth: 24,
  linkedResize: false,
  rowDraggable: false,
  fieldMap: {},
  holidays: [],
  levelColor: false,
  links: [],
  snap: true,
  showExpectedProgress: false,
  rangeStart: null,
  rangeEnd: null,
  moveByUnit: false,
  progressDecimal: 0,
  labels: BUILTIN_LABELS['zh-CN'],
})

engine.flatRows     // 扁平化行列表
engine.geoms        // Map<id, Geom> 条形几何
engine.linkPaths    // 连线路径
engine.criticalIds  // 关键路径任务 ID 集合
engine.chartStart   // 图表起始日期
engine.chartEnd     // 图表结束日期
engine.contentWidth // 内容总宽度（px）
engine.timeToX(Date.now())  // 时间戳 → x 坐标
engine.xToTime(100)         // x 坐标 → 时间戳
```

::: tip 什么时候直接用 Core？
- 后端项目需要计算工期/工作日
- 自定义渲染（Canvas / SVG 手动绘制）
- 非 Vue/React 框架（Solid / Svelte / Angular）
- 单元测试中的 mock 数据生成
:::

---

## TypeScript 支持

所有包都包含完整的 `.d.ts` 类型定义，无需额外安装 `@types/*`。

```ts
import type {
  GanttTask,
  GanttLink,
  GanttColumn,
  ScaleType,
  LinkType,
  FieldMap,
  HolidayItem,
  SnapConfig,
  GanttLabels,
  GanttLocale,
  HeaderStyle,
  BodyStyle,
  ExportOptions,
  TaskChangePayload,
  RowMovePayload,
  Geom,
  Tick,
  LinkPath,
} from '@gantt-pro/core'
```

IDE（VS Code / WebStorm）会自动识别类型，提供智能提示和跳转。

---

## 常见安装问题

### 1. 样式不生效

确保引入了 CSS 文件：

```ts
import '@gantt-pro/vue/style.css'    // Vue
import '@gantt-pro/react/style.css'  // React
```

### 2. 组件高度为 0

`GanttChart` 填充父容器高度，父容器必须设置高度：

```vue
<!-- ❌ 错误：父容器没有高度 -->
<div>
  <GanttChart :data="tasks" />
</div>

<!-- ✅ 正确 -->
<div style="height: 500px;">
  <GanttChart :data="tasks" />
</div>

<!-- ✅ 也可以用 flex -->
<div style="flex: 1; min-height: 0;">
  <GanttChart :data="tasks" />
</div>
```

### 3. 日期解析错误

`gantt-pro` 的日期解析使用本地时区，**不使用** `new Date('2025-01-01')`（这会按 UTC 解析）。格式要求：

```ts
// ✅ 正确格式
{ startDate: '2025-01-01' }                     // YYYY-MM-DD
{ startDate: '2025-01-01T09:00' }               // YYYY-MM-DDTHH:mm（小时刻度）
{ startDate: new Date(2025, 0, 1) }             // Date 对象

// ❌ 不支持
{ startDate: '2025/01/01' }                     // 用 / 分隔
{ startDate: 'Jan 1, 2025' }                    // 英文格式
```

### 4. pnpm 安装报 esbuild 构建脚本被忽略

pnpm 默认阻止依赖的 `postinstall` 脚本。在 `pnpm-workspace.yaml` 中添加：

```yaml
allowBuilds:
  esbuild: true
```

然后重新 `pnpm install`。
