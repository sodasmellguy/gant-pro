# 导出

gantt-pro 支持导出为 PNG 图片、CSV 数据和 JSON 格式。

## 通过 ref 调用

### Vue

```vue
<template>
  <button @click="exportPNG">导出图片</button>
  <button @click="exportCSV">导出CSV</button>
  <button @click="exportJSON">导出JSON</button>
  <GanttChart ref="ganttRef" :data="tasks" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()

function exportPNG() {
  ganttRef.value?.exportData({ format: 'png' })
}

function exportCSV() {
  ganttRef.value?.exportData({ format: 'csv' })
}

function exportJSON() {
  ganttRef.value?.exportData({ format: 'json' })
}
</script>
```

### React

```tsx
const ref = useRef<GanttRef>(null)

<button onClick={() => ref.current?.exportData({ format: 'png' })}>导出图片</button>
```

## 直接使用导出工具

也可以从 `@gantt-pro/core` 直接导入导出函数：

```ts
import { exportGantt, exportCSV, exportJSON, exportPNG, downloadFile } from '@gantt-pro/core'

// 导出 CSV 字符串
const csv = exportCSV(tasks)
console.log(csv)

// 导出 JSON 字符串
const json = exportJSON(tasks)

// 导出 PNG（需要传入 DOM 元素）
const blob = await exportPNG(document.querySelector('.gt-root')!, {
  format: 'png',
  background: '#ffffff',
})
downloadFile(blob, 'gantt.png')

// 统一入口
await exportGantt(tasks, element, { format: 'csv' })
```

## 导出配置

```ts
interface ExportOptions {
  format: 'png' | 'csv' | 'json'
  background?: string        // PNG 背景色（默认透明）
  delimiter?: string         // CSV 分隔符（默认逗号）
  includeChildren?: boolean  // 是否包含子任务（默认 true）
}
```

## CSV 格式

导出的 CSV 包含以下列：

| 列 | 说明 |
|---|---|
| ID | 任务 ID |
| 名称 | 任务名称 |
| 开始日期 | YYYY-MM-DD |
| 结束日期 | YYYY-MM-DD |
| 进度 | 0-100 |
| 负责人 | 负责人姓名 |
| 里程碑 | 是/否 |

## PNG 导出说明

PNG 导出使用 SVG foreignObject + Canvas 方案：
- 自动内联 CSS 变量
- 2x 分辨率渲染（高清）
- 支持自定义背景色

::: warning
跨域样式可能导致导出失败，建议在同源环境下使用。
:::
