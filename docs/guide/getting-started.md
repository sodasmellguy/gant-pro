# 快速开始

本页用一个完整示例带你跑通 gantt-pro，涵盖 Vue 3 和 React 两种框架。

## Vue 3

### 1. 安装

```bash
# pnpm（推荐）
pnpm add @gantt-pro/vue @gantt-pro/core

# 或 npm
npm install @gantt-pro/vue @gantt-pro/core

# 或 yarn
yarn add @gantt-pro/vue @gantt-pro/core
```

::: tip 为什么需要两个包？
`@gantt-pro/core` 是框架无关的核心逻辑层，包含类型定义和工具函数。`@gantt-pro/vue` 是 Vue 适配层。类型从 core 导入，组件从 vue 导入。
:::

### 2. 最小示例

创建一个文件，复制以下代码即可运行：

```vue
<template>
  <div style="height: 400px;">
    <GanttChart
      :data="tasks"
      :links="links"
      :columns="columns"
      scale="day"
      :row-height="36"
      :bar-height="24"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

// ---- 任务数据 ----
const tasks = ref<GanttTask[]>([
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: '张三' },
      { id: 't2', name: '详细设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60, owner: '李四' },
      { id: 'm1', name: '设计评审', startDate: '2025-01-13', milestone: true },
    ],
  },
  {
    id: 'p2',
    name: '项目阶段二',
    children: [
      { id: 't3', name: '开发实现', startDate: '2025-01-14', endDate: '2025-01-25', progress: 30, owner: '王五' },
      { id: 't4', name: '测试验证', startDate: '2025-01-26', endDate: '2025-02-05', progress: 0, owner: '赵六' },
    ],
  },
])

// ---- 依赖连线 ----
const links = ref<GanttLink[]>([
  { from: 't1', to: 't2', type: 'fs' },   // 需求分析完成 → 详细设计开始
  { from: 't2', to: 'm1', type: 'fs' },   // 详细设计完成 → 设计评审
  { from: 'm1', to: 't3', type: 'fs' },   // 设计评审 → 开发实现
  { from: 't3', to: 't4', type: 'fs' },   // 开发完成 → 测试开始
])

// ---- 表格列 ----
const columns: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 220 },
  { key: 'startDate', label: '开始', width: 88, align: 'center' },
  { key: 'endDate', label: '结束', width: 88, align: 'center' },
  { key: 'owner', label: '负责人', width: 76, align: 'center' },
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]
</script>
```

::: warning 必须引入样式
别忘了 `import '@gantt-pro/vue/style.css'`，否则组件没有样式。
:::

### 3. 双向绑定

支持 `v-model:data`、`v-model:scale`、`v-model:links`：

```vue
<template>
  <GanttChart
    v-model:data="tasks"
    v-model:scale="scale"
    v-model:links="links"
  />
</template>
```

拖拽修改任务时间后，`tasks` 会自动更新。

### 4. 开启高级功能

```vue
<template>
  <GanttChart
    :data="tasks"
    :links="links"
    :show-baseline="true"         <!-- 基准线对比 -->
    :show-critical-path="true"    <!-- 关键路径高亮 -->
    :auto-reschedule="true"       <!-- 依赖顺推 -->
    :editable="true"              <!-- 行内编辑 -->
    :row-draggable="true"         <!-- 行拖拽排序 -->
    :show-checkbox="true"         <!-- Checkbox 多选 -->
    :context-menu="true"          <!-- 右键菜单 -->
    :level-color="true"           <!-- 层级行背景色 -->
    :linked-resize="true"         <!-- 父子联动缩放 -->
  />
</template>
```

### 5. 通过 ref 调用方法

```vue
<template>
  <div>
    <button @click="ganttRef?.undo()">撤销</button>
    <button @click="ganttRef?.redo()">重做</button>
    <button @click="ganttRef?.scrollToToday()">回到今天</button>
    <button @click="exportPNG">导出图片</button>
    <GanttChart ref="ganttRef" :data="tasks" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()

function exportPNG() {
  ganttRef.value?.exportData({ format: 'png' })
}
</script>
```

## React

### 1. 安装

```bash
pnpm add @gantt-pro/react @gantt-pro/core
```

### 2. 最小示例

```tsx
import { useState } from 'react'
import { GanttChart } from '@gantt-pro/react'
import '@gantt-pro/react/style.css'
import type { GanttTask, GanttLink, GanttColumn } from '@gantt-pro/core'

const initialTasks: GanttTask[] = [
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
      { id: 't2', name: '详细设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 60 },
    ],
  },
]

const initialLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
]

const columns: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 220 },
  { key: 'startDate', label: '开始', width: 88, align: 'center' },
  { key: 'endDate', label: '结束', width: 88, align: 'center' },
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]

export default function App() {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks)
  const [links, setLinks] = useState<GanttLink[]>(initialLinks)

  return (
    <div style={{ height: 400 }}>
      <GanttChart
        data={tasks}
        links={links}
        columns={columns}
        scale="day"
        onDataChange={setTasks}
        onLinksChange={setLinks}
      />
    </div>
  )
}
```

### 3. 通过 ref 调用方法

```tsx
import { useRef } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

export default function App() {
  const ref = useRef<GanttRef>(null)

  return (
    <div>
      <button onClick={() => ref.current?.undo()}>撤销</button>
      <button onClick={() => ref.current?.scrollToToday()}>回到今天</button>
      <button onClick={() => ref.current?.exportData({ format: 'png' })}>导出</button>
      <div style={{ height: 400 }}>
        <GanttChart ref={ref} data={tasks} />
      </div>
    </div>
  )
}
```

## 运行示例项目

克隆仓库运行完整的 demo：

```bash
git clone <repo-url>
cd gantt-pro
pnpm install
pnpm dev:vue    # Vue 示例 → http://localhost:5173
pnpm dev:react  # React 示例 → http://localhost:5174
```

## 下一步

- [安装引入](./installation) — 了解更多引入方式（CDN、按需引入等）
- [数据模型](../features/data-model) — 了解任务数据结构
- [功能列表](../features/scale) — 逐一了解每个功能
- [API 参考](../api/props) — 查阅完整的 Props / Events / Methods
