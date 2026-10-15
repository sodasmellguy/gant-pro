# 最佳实践

本页总结 gantt-pro 在实际项目中的最佳实践。

## 数据管理

### 1. 使用 ref 持有数据，而非 props 透传

```ts
// ✅ 推荐：在自己的组件内管理数据
const tasks = ref<GanttTask[]>(initialData)
const links = ref<GanttLink[]>(initialLinks)

// 通过 v-model 让甘特图直接操作数据
<GanttChart v-model:data="tasks" v-model:links="links" />
```

### 2. 深拷贝初始数据

甘特图会直接修改传入的数据对象，如果初始数据是共享的，先深拷贝：

```ts
import { cloneDeep } from '你的深拷贝工具'

// 或用 JSON（性能好但不支持函数/Date 对象）
const tasks = ref<GanttTask[]>(JSON.parse(JSON.stringify(rawData)))
```

### 3. 后端数据适配

如果后端返回的字段名不同，用 `fieldMap` 而非改数据：

```ts
// 后端数据
const apiData = [
  { task_id: '1', task_name: '需求分析', begin_date: '2025-01-01', end_date: '2025-01-05' }
]

// 适配
<GanttChart
  :data="apiData"
  :field-map="{
    id: 'task_id',
    name: 'task_name',
    start: 'begin_date',
    end: 'end_date'
  }"
/>
```

## 性能优化

### 1. 大数据量用虚拟滚动

虚拟滚动默认开启，无需配置。但注意：

```ts
// ✅ 任务 ID 要稳定且唯一
{ id: 'task-001', name: '任务' }

// ❌ 不要用数组 index 作为 ID
{ id: String(index) }  // 排序后 ID 变化，导致状态错乱
```

### 2. 避免在模板中做复杂计算

```vue
<!-- ❌ 每次渲染都重新计算 -->
<GanttChart
  :data="rawData.map(t => ({ ...t, color: getColor(t) }))"
/>

<!-- ✅ 用 computed 缓存 -->
<script setup>
const tasks = computed(() => rawData.value.map(t => ({ ...t, color: getColor(t) })))
</script>
<GanttChart :data="tasks" />
```

### 3. 合理设置 infinitePadding

```vue
<!-- 数据量小：减少缓冲，加快首屏 -->
<GanttChart :data="tasks" :infinite-padding="7" />

<!-- 数据量大且跨期长：增加缓冲 -->
<GanttChart :data="tasks" :infinite-padding="60" />
```

### 4. 只读模式减少开销

如果不需要编辑，设置 `readonly`：

```vue
<GanttChart :data="tasks" :readonly="true" :allow-link="false" />
```

## 交互设计

### 1. 合理的列配置

```ts
const columns: GanttColumn[] = [
  // 任务名称要够宽，能显示完整
  { key: 'name', label: '任务名称', width: 240 },

  // 日期列固定宽度，居中对齐
  { key: 'startDate', label: '开始', width: 90, align: 'center' },
  { key: 'endDate', label: '结束', width: 90, align: 'center' },

  // 负责人适中
  { key: 'owner', label: '负责人', width: 80, align: 'center' },

  // 进度列稍窄
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]
```

### 2. 按场景开启功能

```vue
<!-- 管理者视图：只看不编辑 -->
<GanttChart
  :data="tasks"
  :readonly="true"
  :show-critical-path="true"
  :show-baseline="true"
/>

<!-- 执行者视图：可编辑 -->
<GanttChart
  :data="tasks"
  :editable="true"
  :row-draggable="true"
  :auto-reschedule="true"
  :context-menu="true"
/>
```

### 3. 提供操作工具栏

```vue
<template>
  <div class="gantt-toolbar">
    <button @click="ganttRef?.undo()">↶ 撤销</button>
    <button @click="ganttRef?.redo()">↷ 重做</button>
    <span class="divider" />
    <button @click="ganttRef?.scrollToToday()">📍 今天</button>
    <select v-model="scale">
      <option value="hour">小时</option>
      <option value="day">日</option>
      <option value="week">周</option>
      <option value="month">月</option>
    </select>
    <span class="divider" />
    <button @click="exportCSV">📋 导出CSV</button>
    <button @click="exportPNG">🖼️ 导出图片</button>
  </div>
  <GanttChart ref="ganttRef" v-model:data="tasks" v-model:scale="scale" />
</template>
```

## 数据持久化

### 自动保存

监听数据变化自动保存到后端：

```ts
import { watchDebounced } from '@vueuse/core'

// 防抖保存
watchDebounced(tasks, async (newData) => {
  await api.saveTasks(newData)
}, { debounce: 1000, deep: true })
```

### 增量更新

监听 `task-change` 事件只提交变更：

```vue
<GanttChart
  v-model:data="tasks"
  @task-change="onTaskChange"
  @reschedule="onReschedule"
/>
```

```ts
async function onTaskChange(payload: TaskChangePayload) {
  await api.updateTask(payload.task.id, {
    startDate: payload.task.startDate,
    endDate: payload.task.endDate,
    progress: payload.task.progress,
  })
}

async function onReschedule(changes: RescheduleChange[]) {
  // 批量更新顺推的任务
  await api.batchUpdateTasks(changes.map(c => ({
    id: c.task.id,
    startDate: c.task.startDate,
    endDate: c.task.endDate,
  })))
}
```

## 暗色模式适配

```ts
const isDark = useDark()  // 使用 @vueuse/core

<GanttChart :data="tasks" :dark="isDark" />
```

或跟随系统偏好：

```ts
const dark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  dark.value = e.matches
})
```

## 权限控制

```ts
// 根据用户角色控制编辑权限
const canEdit = computed(() => userRole.value === 'manager' || userRole.value === 'owner')

<GanttChart
  :data="tasks"
  :readonly="!canEdit"
  :editable="canEdit"
  :row-draggable="canEdit"
  :allow-link="canEdit"
/>
```
