# 资源面板

gantt-pro 支持在任务上分配资源（人员），并在资源面板中展示。

## 任务资源分配

每个任务可以通过 `resources` 字段分配多个资源：

```ts
import type { ResourceAssignment } from '@gantt-pro/core'

const tasks: GanttTask[] = [
  {
    id: 't1',
    name: '前端开发',
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    progress: 40,
    resources: [
      { name: '张三', allocation: 80, color: '#3b82f6' },
      { name: '李四', allocation: 50, color: '#8b5cf6' },
    ],
  },
  {
    id: 't2',
    name: '后端开发',
    startDate: '2025-01-01',
    endDate: '2025-01-12',
    progress: 60,
    resources: [
      { name: '王五', allocation: 100, color: '#10b981' },
    ],
  },
]
```

### ResourceAssignment

```ts
interface ResourceAssignment {
  name: string           // 资源名称
  allocation?: number    // 分配比例 0-100
  color?: string         // 颜色
}
```

## 开启资源面板

```vue
<GanttChart :data="tasks" :show-resource-panel="true" />
```

## 负责人筛选

配合 `filterOwner` 可以按负责人筛选任务：

```vue
<template>
  <select v-model="ownerFilter">
    <option :value="null">全部资源</option>
    <option value="张三">张三</option>
    <option value="李四">李四</option>
    <option value="王五">王五</option>
  </select>
  <GanttChart
    :data="tasks"
    :show-resource-panel="true"
    :filter-owner="ownerFilter"
  />
</template>
```

筛选后只显示该负责人参与的任务及其父任务链。
