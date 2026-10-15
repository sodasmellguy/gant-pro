# 虚拟滚动

gantt-pro 支持**行 + 列双向虚拟化**，可流畅渲染 1000+ 任务。

## 工作原理

### 行虚拟化

只渲染可视区域内的任务行（通常 20-30 行），滚动时动态替换 DOM。无论有多少任务，DOM 节点数恒定。

### 列虚拟化

时间线区域当列数超过 180 列时自动启用，只渲染可见的时间列。

## 无需配置

虚拟滚动默认开启，无需手动设置。组件会根据数据量自动决定是否启用。

## 大数据量示例

```ts
// 生成 1000 个任务
const tasks: GanttTask[] = Array.from({ length: 1000 }, (_, i) => ({
  id: `t${i}`,
  name: `任务 ${i + 1}`,
  startDate: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
  endDate: `2025-02-${String((i % 28) + 1).padStart(2, '0')}`,
  progress: Math.floor(Math.random() * 100),
}))
```

```vue
<GanttChart :data="tasks" scale="day" />
```

1000 个任务也能保持 60fps 流畅滚动。

## 无限滚动填充

通过 `infinitePadding` 控制时间线左右缓冲天数：

```vue
<!-- 缓冲 30 天 -->
<GanttChart :data="tasks" :infinite-padding="30" />

<!-- 关闭 -->
<GanttChart :data="tasks" :infinite-padding="false" />
```

## 跳转方法

大数据量下可使用跳转方法快速定位：

```ts
// 跳转到今天
ganttRef.value?.scrollToToday()

// 跳转到指定任务
ganttRef.value?.scrollToTask('t500')

// 跳转到指定日期
ganttRef.value?.jumpToDate('2025-06-01')
```

所有跳转方法支持动画：

```ts
ganttRef.value?.scrollToTask('t500', { animate: true })
```
