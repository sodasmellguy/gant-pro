# 时间刻度与缩放

gantt-pro 支持 6 种时间刻度，并提供多种缩放方式。

## 刻度类型

| 刻度 | 说明 | 每天像素宽度 | 适用场景 |
|---|---|---|---|
| `hour` | 小时级 | `hourWidth × 24` | 当天排班、小时级排程 |
| `day` | 日级（默认） | 34px | 日常项目管理 |
| `week` | 周级 | 11px | 中期规划 |
| `month` | 月级 | 3.2px | 季度规划 |
| `quarter` | 季度级 | 1.15px | 年度规划 |
| `year` | 年级 | 0.3px | 长期路线图 |

## 设置刻度

### 基础用法

```vue
<GanttChart :data="tasks" scale="month" />
```

### v-model 受控

```vue
<template>
  <select v-model="scale">
    <option value="hour">小时</option>
    <option value="day">日</option>
    <option value="week">周</option>
    <option value="month">月</option>
    <option value="quarter">季度</option>
    <option value="year">年</option>
  </select>
  <GanttChart v-model:scale="scale" :data="tasks" />
</template>
```

### React

```tsx
const [scale, setScale] = useState<ScaleType>('day')

<GanttChart
  data={tasks}
  scale={scale}
  onScaleChange={setScale}
/>
```

## Ctrl + 滚轮缩放

默认启用。在时间区域内按住 **Ctrl** 滚动鼠标滚轮，刻度逐级切换：

```
小时 → 日 → 周 → 月 → 季度 → 年
（滚轮上）              （滚轮下）
```

缩放特点：
- 以**鼠标指向的日期**为锚点，视觉位置不会跳动
- 切换前后自动保持屏幕中心对应的时间不变

```vue
<!-- 关闭滚轮缩放 -->
<GanttChart :data="tasks" :zoom-on-wheel="false" />
```

## 小时刻度

小时刻度下，每天 24 小时平铺展示。通过 `hourWidth` 控制每小时像素宽度：

```vue
<!-- 默认 24px/小时 = 576px/天 -->
<GanttChart :data="tasks" scale="hour" />

<!-- 更宽：30px/小时 = 720px/天 -->
<GanttChart :data="tasks" scale="hour" :hour-width="30" />

<!-- 更窄：16px/小时 = 384px/天 -->
<GanttChart :data="tasks" scale="hour" :hour-width="16" />
```

小时刻度支持带时间的日期格式：

```ts
const tasks: GanttTask[] = [
  {
    id: 't1',
    name: '上午会议',
    startDate: '2025-01-15T09:00',
    endDate: '2025-01-15T11:30',
  },
  {
    id: 't2',
    name: '下午开发',
    startDate: '2025-01-15T13:00',
    endDate: '2025-01-15T18:00',
    progress: 60,
  },
  {
    id: 't3',
    name: '跨天任务',
    startDate: '2025-01-15T14:00',
    endDate: '2025-01-16T12:00',
  },
]
```

## 自定义刻度

通过 `customScale` 自定义步长和标签格式：

```vue
<GanttChart
  :data="tasks"
  :custom-scale="{ step: 3, labelFormat: 'YYYY-MM' }"
/>
```

| 参数 | 说明 | 示例 |
|---|---|---|
| `step` | 步长 | `3`（每3天/月一个刻度） |
| `labelFormat` | 标签格式 | `'YYYY-MM'`、`'MM-DD'` |

## 触摸双指缩放

移动端支持双指捏合（pinch zoom）缩放刻度，与 Ctrl + 滚轮效果一致。

## 时间范围控制

限制图表只显示指定范围：

```vue
<GanttChart
  :data="tasks"
  range-start="2025-01-01"
  range-end="2025-06-30"
/>
```

| 属性 | 说明 |
|---|---|
| `rangeStart` | 图表起始日期 |
| `rangeEnd` | 图表结束日期 |

不设置时，图表范围自动根据任务日期计算（前后留有 padding）。

## 无限滚动填充

控制时间线左右缓冲天数：

```vue
<!-- 缓冲 30 天（默认） -->
<GanttChart :data="tasks" :infinite-padding="30" />

<!-- 缓冲 60 天，适合长周期项目 -->
<GanttChart :data="tasks" :infinite-padding="60" />

<!-- 关闭无限滚动 -->
<GanttChart :data="tasks" :infinite-padding="false" />
```

## 刻度切换事件

```vue
<GanttChart :data="tasks" @scale-change="onScaleChange" />
```

```ts
function onScaleChange(scale: ScaleType) {
  console.log('刻度切换为:', scale)
  // 可以保存到 localStorage 或 URL
  localStorage.setItem('gantt-scale', scale)
}
```

## 跳转方法

通过 ref 调用跳转方法：

```ts
// 跳转到今天
ganttRef.value?.scrollToToday()

// 跳转到指定任务
ganttRef.value?.scrollToTask('t5')

// 跳转到指定日期
ganttRef.value?.jumpToDate('2025-06-01')
ganttRef.value?.jumpToDate(new Date())

// 带动画（默认 true）
ganttRef.value?.scrollToTask('t5', { animate: false })
ganttRef.value?.scrollToToday({ animate: true })
```

::: tip 动画降级
所有跳转方法支持 `prefers-reduced-motion`：用户在系统设置中开启"减少动画"时，自动降级为直接跳转。
:::
