# Methods

通过 ref 调用的实例方法。

## 获取 ref

### Vue

```vue
<template>
  <GanttChart ref="ganttRef" :data="tasks" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()
</script>
```

### React

```tsx
import { useRef } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

const ref = useRef<GanttRef>(null)

<GanttChart ref={ref} data={tasks} />
```

## 方法列表

### undo

撤销上一步操作。

```ts
ganttRef.value?.undo()
```

### redo

重做上一步撤销的操作。

```ts
ganttRef.value?.redo()
```

### canUndo / canRedo

::: tip Vue only
返回 `ComputedRef<boolean>`，表示是否可撤销/重做。
:::

```ts
// Vue
const canUndo = ganttRef.value?.canUndo  // ComputedRef<boolean>
```

### scrollToToday

滚动到今天的位置。

```ts
ganttRef.value?.scrollToToday()
ganttRef.value?.scrollToToday({ animate: true })
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `animate` | `boolean` | `true` | 是否动画 |

### scrollToTask

滚动到指定任务。

```ts
ganttRef.value?.scrollToTask('t1')
ganttRef.value?.scrollToTask('t1', { animate: false })
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | `string` | — | 任务 ID |
| `animate` | `boolean` | `true` | 是否动画 |

### jumpToDate

跳转到指定日期。

```ts
ganttRef.value?.jumpToDate('2025-06-01')
ganttRef.value?.jumpToDate(new Date())
ganttRef.value?.jumpToDate()  // 默认今天
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `date` | `string \| Date` | 今天 | 目标日期 |
| `animate` | `boolean` | `true` | 是否动画 |

### print

调用浏览器打印。

```ts
ganttRef.value?.print()
```

### exportData

导出甘特图。

```ts
// 导出 PNG
await ganttRef.value?.exportData({ format: 'png' })

// 导出 CSV
await ganttRef.value?.exportData({ format: 'csv' })

// 导出 JSON
await ganttRef.value?.exportData({ format: 'json' })
```

| 参数 | 类型 | 说明 |
|---|---|---|
| `format` | `'png' \| 'csv' \| 'json'` | 导出格式 |

### getSelected

获取当前选中的任务 ID 集合（需开启 `showCheckbox`）。

```ts
const ids = ganttRef.value?.getSelected()  // Set<string>
```

### selectAll

全选 / 取消全选。

```ts
ganttRef.value?.selectAll(true)   // 全选
ganttRef.value?.selectAll(false)  // 取消全选
```

## 动画降级

所有滚动方法支持 `prefers-reduced-motion`：当用户在系统设置中开启"减少动画"时，自动降级为直接跳转。
