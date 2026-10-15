# 工具函数

`@gantt-pro/core` 导出大量独立的工具函数，可在无 UI 组件的场景下单独使用。

## 日期工具

所有日期函数基于**本地时区**，不使用 UTC。

### 导入

```ts
import {
  toDate, toDateWithTime, startOfDay, addDays, addHours,
  diffDays, diffHours, startOfWeek, endOfWeek,
  startOfMonth, startOfQuarter, startOfHalfYear,
  daysInMonth, isWeekend, fmt, maxDate, minDate,
  MS_DAY, MS_HOUR, type DateLike
} from '@gantt-pro/core'
```

### toDate

解析日期字符串或 Date 对象，**截断到天**（时分秒归零）：

```ts
toDate('2025-01-15')           // Date(2025, 0, 15)
toDate('2025-01-15T09:30')     // Date(2025, 0, 15) ← 时分被截断
toDate(new Date(2025, 0, 15))  // Date(2025, 0, 15)
```

::: warning
不使用 `new Date('2025-01-15')`，因为这在某些浏览器中会按 UTC 解析导致日期偏移。
:::

### toDateWithTime

解析日期，**保留时分**（小时刻度用）：

```ts
toDateWithTime('2025-01-15T09:30')  // Date(2025, 0, 15, 9, 30)
toDateWithTime('2025-01-15')        // Date(2025, 0, 15, 0, 0)
```

### startOfDay

获取某天的 00:00:00：

```ts
startOfDay(new Date(2025, 0, 15, 14, 30))  // Date(2025, 0, 15, 0, 0, 0)
```

### addDays / addHours

加减天数/小时：

```ts
addDays(new Date(2025, 0, 15), 7)    // Date(2025, 0, 22)
addDays(new Date(2025, 0, 15), -3)   // Date(2025, 0, 12)
addHours(new Date(2025, 0, 15, 10), 3)  // Date(2025, 0, 15, 13)
```

### diffDays / diffHours

计算两个日期的差值：

```ts
diffDays(new Date(2025, 0, 15), new Date(2025, 0, 10))  // 5
diffHours(new Date(2025, 0, 15, 15), new Date(2025, 0, 15, 10))  // 5
```

### startOfWeek / endOfWeek

获取所在周的周一/周日：

```ts
startOfWeek(new Date(2025, 0, 15))  // 2025-01-13（周一）
endOfWeek(new Date(2025, 0, 15))    // 2025-01-19（周日）
```

::: tip
gantt-pro 的"周"以**周一**为起始日（不是周日）。
:::

### startOfMonth / startOfQuarter / startOfHalfYear

```ts
startOfMonth(new Date(2025, 2, 15))      // 2025-03-01
startOfQuarter(new Date(2025, 4, 15))    // 2025-04-01（Q2 起点）
startOfHalfYear(new Date(2025, 8, 15))   // 2025-07-01（下半年起点）
```

### daysInMonth

获取某月的天数：

```ts
daysInMonth(new Date(2025, 1, 1))  // 28（2025年2月）
daysInMonth(new Date(2024, 1, 1))  // 29（2024闰年2月）
```

### isWeekend

```ts
isWeekend(new Date(2025, 0, 4))   // true（周六）
isWeekend(new Date(2025, 0, 6))   // true（周日）
isWeekend(new Date(2025, 0, 7))   // false（周二）
```

### fmt

格式化日期：

```ts
fmt(new Date(2025, 0, 15), 'YYYY-MM-DD')     // '2025-01-15'
fmt(new Date(2025, 0, 15), 'MM/DD')          // '01/15'
fmt(new Date(2025, 0, 15, 9, 30), 'HH:mm')   // '09:30'
fmt(new Date(2025, 0, 15), 'YYYY年MM月DD日')  // '2025年01月15日'
```

支持的占位符：`YYYY`、`MM`、`DD`、`HH`、`mm`。

### maxDate / minDate

```ts
maxDate(new Date(2025, 0, 15), new Date(2025, 0, 20))  // 2025-01-20
minDate(new Date(2025, 0, 15), new Date(2025, 0, 20))  // 2025-01-15
```

---

## 几何计算

### getPxPerDay

获取某个刻度下每天的像素宽度：

```ts
getPxPerDay('hour', 24)    // 576（24 * 24）
getPxPerDay('day', 24)     // 34
getPxPerDay('week', 24)    // 11
getPxPerDay('month', 24)   // 3.2
getPxPerDay('quarter', 24) // 1.15
getPxPerDay('year', 24)    // 0.3
```

### computeChartRange

根据任务日期列表计算图表范围：

```ts
const { chartStart, chartEnd } = computeChartRange([
  { start: toDate('2025-01-01'), end: toDate('2025-01-05') },
  { start: toDate('2025-01-10'), end: toDate('2025-01-20') },
])
// chartStart = 2024-12-30（周一对齐，前 padding 2 天）
// chartEnd = 2025-02-09（周日后 padding 20 天）
```

### createTimeConverter

创建时间 ↔ 像素的转换器：

```ts
const conv = createTimeConverter(chartStart, 'day', 34, 24)

const x = conv.timeToX(new Date('2025-01-15').getTime())  // 像素坐标
const ts = conv.xToTime(200)  // 时间戳
```

### barWidth

计算任务条形的宽度：

```ts
const w = barWidth(
  new Date(2025, 0, 1),   // 开始
  new Date(2025, 0, 5),   // 结束
  'day',                   // 刻度
  34,                      // 每天像素
  24                       // 每小时像素
)
// 170 (5天 × 34px)
```

### routeLink

计算依赖连线的 SVG path：

```ts
const d = routeLink(
  { x: 100, y: 50, w: 80, h: 24 },  // 起点条形几何
  { x: 300, y: 100, w: 80, h: 24 }, // 终点条形几何
  'fs'                               // 依赖类型
)
// 'M180,62 L240,62 L240,112 L300,112' ← SVG path 字符串
```

---

## 关键路径

```ts
import { computeCriticalIds } from '@gantt-pro/core'

const criticalIds = computeCriticalIds(
  tasks,     // 任务树
  links,     // 依赖连线
  datesOf,   // 日期计算函数
  walk       // 遍历函数
)
// Set { 't1', 't3', 't5' }
```

`datesOf` 和 `walk` 需要自行提供（或通过 GanttEngine 获取）：

```ts
// 简单实现
const datesOf = (t: GanttTask) => ({
  start: t.startDate ? toDate(t.startDate) : null,
  end: t.endDate ? toDate(t.endDate) : null,
})

const walk = (list: GanttTask[], fn: (t: GanttTask) => void) => {
  for (const t of list) {
    fn(t)
    if (t.children?.length) walk(t.children, fn)
  }
}
```

---

## 依赖顺推

```ts
import { rescheduleFrom, shiftTask } from '@gantt-pro/core'

// 从触发任务出发按依赖链顺推
const changes = rescheduleFrom(
  't1',      // 触发任务 ID
  tasks,     // 任务树
  links,     // 依赖连线
  datesOf,   // 日期计算函数
  walk,      // 遍历函数
  false      // 是否小时刻度
)
// [{ task: GanttTask, oldStartDate: '2025-01-06', oldEndDate: '2025-01-12' }, ...]
```

---

## 扁平化

```ts
import { flattenTasks } from '@gantt-pro/core'

// 扁平化任务树
const flat = flattenTasks(tasks)
// [{ id: 'p1', ... }, { id: 't1', ... }, { id: 't2', ... }, ...]

// 不包含子任务
const topOnly = flattenTasks(tasks, false)
// [{ id: 'p1', ... }]
```
