# 插槽与自定义渲染

gantt-pro 提供多个插槽（Vue）和渲染函数（React），让你自定义表格单元格和条形内容。

## Vue 插槽

### 1. 表头插槽

自定义表头单元格内容。插槽名格式为 `header-{columnKey}`：

```vue
<template>
  <GanttChart :data="tasks" :columns="columns">
    <!-- 自定义"任务名称"列表头 -->
    <template #header-name="{ column }">
      <span style="font-weight: bold; color: #3b82f6;">
        {{ column.label }}
      </span>
    </template>

    <!-- 自定义"进度"列表头，加个图标 -->
    <template #header-progress="{ column }">
      📊 {{ column.label }}
    </template>
  </GanttChart>
</template>
```

### 2. 单元格插槽

自定义表格单元格内容。插槽名格式为 `col-{columnKey}`，`name` 列有特殊插槽 `col-name`：

```vue
<template>
  <GanttChart :data="tasks">
    <!-- 任务名称列（带缩进和展开图标，已有默认实现，可覆盖） -->
    <template #col-name="{ task, depth, summary }">
      <span :style="{ paddingLeft: depth * 16 + 'px' }">
        <span v-if="summary" class="toggle-icon">▶</span>
        {{ task.name }}
        <span v-if="task.milestone" class="milestone-badge">里程碑</span>
      </span>
    </template>

    <!-- 负责人列：显示头像 -->
    <template #col-owner="{ task }">
      <div v-if="task.owner" style="display: flex; align-items: center; gap: 4px;">
        <span
          class="avatar"
          :style="{ background: typeof task.owner === 'object' ? task.owner.color : '#3b82f6' }"
        >
          {{ (typeof task.owner === 'string' ? task.owner : task.owner.name).charAt(0) }}
        </span>
        {{ typeof task.owner === 'string' ? task.owner : task.owner.name }}
      </div>
    </template>

    <!-- 进度列：用进度条展示 -->
    <template #col-progress="{ task }">
      <div class="mini-progress">
        <div class="mini-progress-bar" :style="{ width: (task.progress || 0) + '%' }" />
        <span>{{ task.progress || 0 }}%</span>
      </div>
    </template>
  </GanttChart>
</template>
```

### 3. 条形内容插槽

开启 `barSlot` 后，可通过 `bar-content` 插槽自定义条形内部内容：

```vue
<template>
  <GanttChart :data="tasks" :bar-slot="true">
    <template #bar-content="{ task, geom, progress }">
      <!-- 在条形内部显示任务名和进度 -->
      <span class="bar-label">
        {{ task.name }} ({{ progress }}%)
      </span>

      <!-- 显示负责人头像 -->
      <span v-if="task.owner" class="bar-owner">
        {{ typeof task.owner === 'string' ? task.owner : task.owner.name }}
      </span>
    </template>
  </GanttChart>
</template>
```

### 插槽作用域参数

| 插槽 | 参数 | 说明 |
|---|---|---|
| `header-{key}` | `column: GanttColumn` | 列配置 |
| `col-name` | `task, depth, summary` | 任务名专用 |
| `col-{key}` | `task, depth, summary` | 通用列 |
| `bar-content` | `task, geom, progress` | 条形内容 |

## React 渲染函数

React 版通过 `renderBarContent` 函数自定义条形内容：

```tsx
import { GanttChart } from '@gantt-pro/react'
import type { GanttTask, Geom } from '@gantt-pro/core'

<GanttChart
  data={tasks}
  barSlot={true}
  renderBarContent={(task: GanttTask, geom: Geom, progress: number) => (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 6px' }}>
      <span style={{ color: '#fff', fontSize: 12 }}>
        {task.name} ({progress}%)
      </span>
    </div>
  )}
/>
```

## 自定义样式技巧

### 条形渐变色

```css
/* 给特定任务设置渐变 */
.gt-bar[data-task-id="urgent-1"] {
  background: linear-gradient(135deg, #ef4444, #f59e0b);
}
```

### 条形图标

在条形内部显示状态图标：

```vue
<template #bar-content="{ task }">
  <span v-if="task.status === 'blocked'" class="status-icon">🚫</span>
  <span v-if="task.status === 'done'" class="status-icon">✅</span>
  <span v-if="task.status === 'active'" class="status-icon">🔄</span>
  {{ task.name }}
</template>
```

### 条件颜色

根据进度动态改变条形颜色：

```ts
const tasks = computed(() => rawData.value.map(t => ({
  ...t,
  color: t.progress >= 100 ? '#10b981'   // 完成 → 绿色
       : t.progress > 0   ? '#3b82f6'    // 进行中 → 蓝色
       :                      '#94a3b8'  // 未开始 → 灰色
})))
```
