# 工作日历

工作日历功能允许自定义工作日/休息日，进度计算可排除非工作日。

## 为什么需要工作日历

国内项目排期需要考虑：
- **周末**：周六周日休息
- **法定节假日**：春节、国庆、中秋等
- **调休补班**：周末调休上班

gantt-pro 的 `createWorkCalendar()` 可以精确模拟这些规则。

## 创建工作日历

```ts
import { createWorkCalendar } from '@gantt-pro/core'

const calendar = createWorkCalendar({
  // 每周休息日（0=周日, 6=周六），默认 [0, 6]
  weekendDays: [0, 6],

  // 法定节假日
  holidays: [
    '2025-01-01',   // 元旦
    '2025-01-28',   // 春节
    '2025-01-29', '2025-01-30', '2025-01-31',
    '2025-02-01', '2025-02-02', '2025-02-03',
    '2025-04-04',   // 清明
    '2025-05-01',   // 劳动节
    '2025-06-01',   // 端午
    '2025-10-01', '2025-10-02', '2025-10-03',  // 国庆
  ],

  // 调休补班日（原本是周末但要上班）
  workdays: [
    '2025-01-25',   // 春节前周六补班
    '2025-02-08',   // 春节后周日补班
    '2025-04-27',   // 五一前周日补班
  ],
})
```

### 优先级

判断某天是否为工作日时，优先级从高到低：

1. **调休补班**（`workdays`）→ 一定是工作日
2. **法定节假日**（`holidays`）→ 一定不是工作日
3. **周末**（`weekendDays`）→ 不是工作日
4. **其他** → 是工作日

::: tip 调休优先
调休补班优先级最高，即使那天是周末或节假日，也判定为工作日。这符合国内调休制度。
:::

## API

### isWorkday

```ts
calendar.isWorkday('2025-01-06')  // true（周一）
calendar.isWorkday('2025-01-04')  // false（周六）
calendar.isWorkday('2025-01-01')  // false（元旦）
calendar.isWorkday('2025-01-25')  // true（调休补班，虽然是周六）
```

### isHoliday

```ts
calendar.isHoliday('2025-01-04')  // true（周六）
calendar.isHoliday('2025-01-06')  // false（周一）
```

### workdayCount

计算两个日期之间的工作日数（含起止当天）：

```ts
calendar.workdayCount('2025-01-06', '2025-01-10')  // 5（周一到周五）
calendar.workdayCount('2025-01-04', '2025-01-05')  // 0（周末）
```

### effectiveDuration

排除非工作日后的有效工期天数：

```ts
calendar.effectiveDuration('2025-01-06', '2025-01-15')  // 8（去掉2个周末）
```

### addWorkdays

从某天起加 N 个工作日：

```ts
calendar.addWorkdays('2025-01-06', 5)   // 2025-01-13（下周一）
calendar.addWorkdays('2025-01-10', 1)   // 2025-01-13（周五+1=下周一）
calendar.addWorkdays('2025-01-06', -1)  // 2025-01-03（上周五）
```

### getHolidaysInMonth

```ts
const holidays = calendar.getHolidaysInMonth(2025, 0)  // 2025年1月
// [Date(2025-01-01), Date(2025-01-04), Date(2025-01-05), ...]
```

::: warning 月份从 0 开始
JavaScript 的 `Date` 月份从 0 开始，0 = 一月，1 = 二月。
:::

## 在组件中标记假日

组件通过 `holidays` prop 标记假日背景：

```ts
import type { HolidayItem } from '@gantt-pro/core'

const holidays: HolidayItem[] = [
  { date: '2025-01-01', color: '#ef4444', label: '元旦' },
  { date: '2025-01-29', color: '#ef4444', label: '春节' },
  { date: '2025-04-04', color: '#ef4444', label: '清明' },
  { date: '2025-05-01', color: '#ef4444', label: '劳动节' },
  { date: '2025-10-01', color: '#ef4444', label: '国庆' },
]
```

```vue
<GanttChart :data="tasks" :holidays="holidays" />
```

假日会在时间线上以特殊背景色显示，鼠标悬停显示标签。

## 周末高亮

```vue
<GanttChart :data="tasks" :show-weekend="true" />
```

日刻度和小时刻度下周末会有灰色背景。

## 实战：计算项目工期

```ts
const cal = createWorkCalendar({
  weekendDays: [0, 6],
  holidays: ['2025-01-01', '2025-01-29'],
})

// 任务从 1/6 到 1/20，自然天 15 天
// 去掉 4 个周末 = 7 天休息日
// 实际工作日 = 8 天
console.log(cal.workdayCount('2025-01-06', '2025-01-20'))  // 10

// 从 1/6 开始需要 5 个工作日，哪天能完成？
console.log(cal.addWorkdays('2025-01-06', 5))  // 2025-01-13
```
