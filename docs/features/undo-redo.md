# 撤销与重做

gantt-pro 内置完整的 undo/redo 历史栈，所有操作均可回退。

## 支持的操作

以下操作会被记录到历史栈：

| 操作 | mode | 说明 |
|---|---|---|
| 拖拽移动 | `move` | 改变任务开始/结束日期 |
| 左端缩放 | `left` | 改变开始日期 |
| 右端缩放 | `right` | 改变结束日期 |
| 拖拽进度 | `progress` | 改变完成进度 |
| 行内编辑 | `edit` | 修改名称/进度 |
| 行拖拽排序 | — | 改变顺序和层级 |
| 删除任务 | — | 移除任务及关联连线 |

## 历史栈行为

```
操作序列：  A → B → C
                                    undoStack: [A, B, C]
                                    redoStack: []

undo():     A → B ← (撤回到B)       undoStack: [A, B]
                                    redoStack: [C]

undo():     A ← (撤回到A)            undoStack: [A]
                                    redoStack: [C, B]

redo():     A → B ← (恢复到B)       undoStack: [A, B]
                                    redoStack: [C]

新操作 D:   A → B → D               undoStack: [A, B, D]
                                    redoStack: [] ← redo栈被清空
```

::: tip
新操作会清空 redo 栈。undo 后再 redo 可以恢复，但 undo 后做新操作则不能再 redo。
:::

## 使用方法

### Vue

通过 ref 调用 `undo()` / `redo()`：

```vue
<template>
  <div>
    <button @click="ganttRef?.undo()" :disabled="!canUndo">↶ 撤销</button>
    <button @click="ganttRef?.redo()" :disabled="!canRedo">↷ 重做</button>
    <GanttChart ref="ganttRef" :data="tasks" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { GanttChart, type GanttRef } from '@gantt-pro/vue'

const ganttRef = ref<GanttRef>()

// 通过 ref 读取 canUndo/canRedo
const canUndo = ref(false)
const canRedo = ref(false)

// 监听 undo/redo 事件更新按钮状态
function updateState() {
  canUndo.value = ganttRef.value?.canUndo?.value ?? false
  canRedo.value = ganttRef.value?.canRedo?.value ?? false
}
</script>
```

### React

```tsx
import { useRef, useState } from 'react'
import { GanttChart, type GanttRef } from '@gantt-pro/react'

function App() {
  const ref = useRef<GanttRef>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  return (
    <div>
      <button onClick={() => { ref.current?.undo(); updateState() }}>
        撤销
      </button>
      <button onClick={() => { ref.current?.redo(); updateState() }}>
        重做
      </button>
      <GanttChart
        ref={ref}
        data={tasks}
        onUndo={() => setCanUndo(true)}
        onRedo={() => setCanRedo(true)}
      />
    </div>
  )
}
```

## 事件监听

```vue
<GanttChart :data="tasks" @undo="onUndo" @redo="onRedo" />
```

```ts
function onUndo(entry: HistoryEntry) {
  console.log('撤销操作:', entry)
  // entry.id: 任务ID
  // entry.before: 撤销前的状态
  // entry.after: 撤销后的状态
}

function onRedo(entry: HistoryEntry) {
  console.log('重做操作:', entry)
}
```

## HistoryEntry 结构

```ts
interface HistoryEntry {
  id: string   // 任务 ID
  before: {
    name?: string
    startDate?: string | Date
    endDate?: string | Date
    progress?: number
  }
  after: {
    name?: string
    startDate?: string | Date
    endDate?: string | Date
    progress?: number
  }
}
```

## 键盘快捷键

你可以自行绑定键盘快捷键：

```ts
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})

function onKeyDown(e: KeyboardEvent) {
  // Ctrl+Z = 撤销
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    ganttRef.value?.undo()
  }
  // Ctrl+Shift+Z 或 Ctrl+Y = 重做
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    ganttRef.value?.redo()
  }
}
```

## 工具栏示例

```vue
<template>
  <div class="gantt-toolbar">
    <button @click="ganttRef?.undo()" title="撤销 (Ctrl+Z)">↶</button>
    <button @click="ganttRef?.redo()" title="重做 (Ctrl+Y)">↷</button>
    <span class="divider" />
    <button @click="ganttRef?.scrollToToday()">📍 今天</button>
  </div>
  <GanttChart ref="ganttRef" :data="tasks" />
</template>

<style>
.gantt-toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.gantt-toolbar button {
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
.gantt-toolbar button:hover {
  background: #f1f5f9;
}
.gantt-toolbar .divider {
  width: 1px;
  background: #e2e8f0;
  margin: 0 4px;
}
</style>
```
