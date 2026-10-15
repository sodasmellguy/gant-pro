# Events

## Vue 事件

| 事件名 | 参数 | 说明 |
|---|---|---|
| `update:data` | `(data: GanttTask[])` | data 变化（v-model:data） |
| `update:scale` | `(scale: ScaleType)` | scale 变化（v-model:scale） |
| `update:links` | `(links: GanttLink[])` | links 变化（v-model:links） |
| `scale-change` | `(scale: ScaleType)` | 刻度切换 |
| `task-change` | `(payload: TaskChangePayload)` | 任务拖拽/编辑后 |
| `task-click` | `(task: GanttTask)` | 点击任务 |
| `row-click` | `(task: GanttTask)` | 点击行 |
| `row-dbl-click` | `(task: GanttTask)` | 双击行 |
| `row-move` | `(payload: RowMovePayload)` | 行拖拽排序 |
| `expand` | `(task: GanttTask, expanded: boolean)` | 展开/折叠 |
| `link-create` | `(payload: { from: string; to: string })` | 创建连线 |
| `link-click` | `(link: GanttLink)` | 点击连线 |
| `link-delete` | `(link: GanttLink)` | 删除连线 |
| `reschedule` | `(changes: RescheduleChange[])` | 依赖顺推变更 |
| `selection-change` | `(ids: string[])` | 选择变化 |
| `context-menu` | `(payload: { task: GanttTask; x: number; y: number })` | 右键菜单 |
| `visible-range-change` | `(range: { start: Date; end: Date })` | 可见范围变化 |
| `undo` | `(entry: any)` | 撤销 |
| `redo` | `(entry: any)` | 重做 |

## React 回调

React 版通过 props 传递回调：

| 回调 prop | 参数 | 说明 |
|---|---|---|
| `onDataChange` | `(data: GanttTask[])` | data 变化 |
| `onLinksChange` | `(links: GanttLink[])` | links 变化 |
| `onScaleChange` | `(scale: ScaleType)` | 刻度切换 |
| `onTaskChange` | `(payload: TaskChangePayload)` | 任务变更 |
| `onLinkCreate` | `(payload: { from: string; to: string })` | 创建连线 |
| `onLinkClick` | `(link: GanttLink)` | 点击连线 |
| `onLinkDelete` | `(link: GanttLink)` | 删除连线 |
| `onLinkDblClick` | `(link: GanttLink)` | 双击连线 |
| `onRowClick` | `(task: GanttTask)` | 点击行 |
| `onRowDblClick` | `(task: GanttTask)` | 双击行 |
| `onExpand` | `(task: GanttTask, expanded: boolean)` | 展开/折叠 |
| `onReschedule` | `(changes: RescheduleChange[])` | 顺推变更 |
| `onRowMove` | `(payload: RowMovePayload)` | 行排序 |
| `onSelectionChange` | `(ids: string[])` | 选择变化 |
| `onContextMenu` | `(payload: { task: GanttTask; x: number; y: number })` | 右键菜单 |
| `onVisibleRangeChange` | `(range: { start: Date; end: Date })` | 可见范围 |
| `onUndo` | `(entry: any)` | 撤销 |
| `onRedo` | `(entry: any)` | 重做 |

## TaskChangePayload

```ts
interface TaskChangePayload {
  task: GanttTask
  mode: 'move' | 'left' | 'right' | 'progress' | 'edit'
  oldStartDate?: string | Date
  oldEndDate?: string | Date
  oldProgress?: number
  oldName?: string
}
```

## RowMovePayload

```ts
interface RowMovePayload {
  task: GanttTask
  fromIndex: number
  toIndex: number
  parentId: string | null
}
```
