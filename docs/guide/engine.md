# 核心引擎 (GanttEngine)

`GanttEngine` 是 gantt-pro 的框架无关核心状态引擎，所有业务逻辑都在这里。

## 架构概览

```
┌─────────────────────────────────────────────┐
│              GanttEngine                      │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Signal  │  │ Options  │  │  Collapsed  │ │
│  │ (data)  │  │ (config) │  │  (折叠状态)  │ │
│  └────┬────┘  └────┬─────┘  └─────────────┘ │
│       │            │                          │
│  ┌────▼────────────▼──────────────────────┐  │
│  │           计算属性 (缓存)                │  │
│  │  flatRows / geoms / linkPaths /         │  │
│  │  criticalIds / topTicks / bottomTicks   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ History │  │  Drag    │  │  Methods    │ │
│  │ (undo)  │  │ (拖拽)   │  │ (find/set)  │ │
│  └─────────┘  └──────────┘  └─────────────┘ │
└─────────────────────────────────────────────┘
```

## 响应式原语

gantt-pro 不依赖 Vue 或 React 的响应式系统，自实现了轻量级 Signal/Computed：

```ts
import { Signal, signal, computed, batch, effect } from '@gantt-pro/core'

// 创建信号
const count = signal(0)

// 读取/写入
console.log(count.value)  // 0
count.value = 1

// 计算属性
const doubled = computed(() => count.value * 2)

// 批量更新（只触发一次 effect）
batch(() => {
  count.value = 2
  count.value = 3
})

// 副作用
effect(() => {
  console.log('count changed:', count.value)
})
```

::: tip
Vue 适配层通过订阅 Signal 写入 Vue ref 实现桥接；React 适配层通过 Signal 版本号触发重渲染。
:::

## 创建引擎

```ts
import { GanttEngine, BUILTIN_LABELS } from '@gantt-pro/core'
import type { GanttTask } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  { id: 't1', name: '任务', startDate: '2025-01-01', endDate: '2025-01-05', progress: 50 },
]

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
```

## 核心属性

### 数据与配置

| 属性 | 类型 | 说明 |
|---|---|---|
| `data` | `Signal<GanttTask[]>` | 任务树数据 |
| `options` | `Signal<EngineOptions>` | 引擎配置 |
| `collapsed` | `Set<string>` | 折叠的任务 ID 集合 |
| `selectedId` | `Signal<string \| null>` | 选中任务 ID |
| `hoverId` | `Signal<string \| null>` | 悬停任务 ID |

### 时间与坐标

| 属性 | 类型 | 说明 |
|---|---|---|
| `isHour` | `boolean` | 是否小时刻度 |
| `pxPerDay` | `number` | 每天像素宽度 |
| `minStart` | `Date` | 所有任务最早开始日期 |
| `maxEnd` | `Date` | 所有任务最晚结束日期 |
| `chartStart` | `Date` | 图表起始日期 |
| `chartEnd` | `Date` | 图表结束日期 |
| `totalDays` | `number` | 图表总天数 |
| `contentWidth` | `number` | 内容总宽度（px） |
| `todayX` | `number` | 今日的 x 坐标 |

### 计算属性（带缓存）

| 属性 | 类型 | 说明 |
|---|---|---|
| `flatRows` | `RowItem[]` | 扁平化行列表（含层级深度） |
| `geoms` | `Map<string, Geom>` | 每个任务的条形几何 |
| `linkPaths` | `LinkPath[]` | 依赖连线路径 |
| `criticalIds` | `Set<string>` | 关键路径任务 ID 集合 |
| `topTicks` | `Tick[]` | 顶层刻度 |
| `bottomTicks` | `Tick[]` | 底层刻度 |
| `weekendCols` | `{ left, width }[]` | 周末背景列 |
| `holidayCols` | `{ left, width, color?, label? }[]` | 假日背景列 |

### 坐标换算

```ts
// 时间戳 → x 像素坐标
const x = engine.timeToX(Date.now())

// x 像素坐标 → 时间戳
const ts = engine.xToTime(200)

// 今日的 x 坐标
const todayX = engine.todayX
```

## 核心方法

### 数据操作

```ts
// 更新数据（会清空历史栈）
engine.setData(newTasks)

// 更新配置
engine.updateOptions({ scale: 'week', readonly: true })

// 查找任务
const task = engine.findTask('t1')

// 查找祖先链（从近到远）
const ancestors = engine.findAncestors('t1')
```

### 遍历

```ts
// 遍历所有任务（含子任务）
engine.walk(tasks, (task) => {
  console.log(task.id, task.name)
})
```

### 日期计算

```ts
// 获取任务的有效日期（汇总行取子树极值）
const { start, end } = engine.effDates(task)

// 获取基准线日期
const { start, end } = engine.baseDates(task)

// 获取汇总进度（子任务平均值）
const progress = engine.summaryProgress(task)
```

### 展开/折叠

```ts
// 切换折叠状态
engine.toggleCollapse('t1')

// 折叠所有
engine.collapseAll()

// 展开所有
engine.expandAll()
```

## 使用场景

### 1. 服务端工期计算

```ts
import { createWorkCalendar } from '@gantt-pro/core'

const cal = createWorkCalendar({
  weekendDays: [0, 6],
  holidays: ['2025-01-01', '2025-01-29'],
})

// 计算两个日期间的有效工作日
const workdays = cal.workdayCount('2025-01-06', '2025-01-12')  // 5

// 从今天起加 10 个工作日后的日期
const deadline = cal.addWorkdays(new Date(), 10)
```

### 2. 自定义渲染（Canvas）

```ts
const engine = new GanttEngine(tasks, options)

// 获取几何信息，用 Canvas 绘制
const canvas = document.querySelector('canvas')!
const ctx = canvas.getContext('2d')!

for (const [id, geom] of engine.geoms) {
  ctx.fillStyle = geom.critical ? '#ef4444' : '#3b82f6'
  ctx.fillRect(geom.x, geom.y, geom.w, geom.h)

  if (geom.baseline) {
    ctx.strokeStyle = '#94a3b8'
    ctx.strokeRect(geom.bx, geom.y + 4, geom.bw, geom.h - 8)
  }
}

// 绘制连线
for (const link of engine.linkPaths) {
  const path2d = new Path2D(link.d)
  ctx.strokeStyle = link.critical ? '#ef4444' : '#94a3b8'
  ctx.stroke(path2d)
}
```

### 3. 非 Vue/React 框架（如 Solid）

```ts
import { GanttEngine } from '@gantt-pro/core'
import { createSignal } from 'solid-js'

function createSolidGanttStore(tasks: GanttTask[], options: EngineOptions) {
  const engine = new GanttEngine(tasks, options)
  const [version, setVersion] = createSignal(0)

  // 订阅引擎变化，触发 Solid 重渲染
  effect(() => {
    engine.dragVersion.value
    engine.linkDraftVersion.value
    setVersion(v => v + 1)
  })

  return { engine, version }
}
```
