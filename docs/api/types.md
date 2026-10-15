# 类型定义

所有类型从 `@gantt-pro/core` 导入。

```ts
import type {
  GanttTask, GanttLink, GanttColumn, ScaleType, LinkType,
  FieldMap, HolidayItem, SnapConfig, ContextMenuItem,
  GanttLabels, GanttLocale, HeaderStyle, BodyStyle,
  ExportOptions, GanttSyncConfig, ResourceAssignment,
  TaskSegment, DragMode, TaskChangePayload, RowMovePayload,
  TaskChangeMode, RescheduleChange, Geom,
} from '@gantt-pro/core'
```

## GanttTask

```ts
interface GanttTask {
  id: string
  name: string
  startDate?: string | Date
  endDate?: string | Date
  baselineStart?: string | Date
  baselineEnd?: string | Date
  owner?: string | { name: string; color?: string }
  progress?: number           // 0-100
  milestone?: boolean
  collapsed?: boolean
  color?: string
  barEffect?: 'shimmer' | 'pulse' | 'flow'
  status?: 'planned' | 'active' | 'blocked' | 'done'
  expectedProgress?: number   // 0-100
  segments?: TaskSegment[]
  resources?: ResourceAssignment[]
  children?: GanttTask[]
  [key: string]: any
}
```

## GanttLink

```ts
interface GanttLink {
  from: string
  to: string
  type?: LinkType   // 'fs' | 'ss' | 'ff' | 'sf'，默认 'fs'
  color?: string
}
```

## GanttColumn

```ts
interface GanttColumn {
  key: string
  label: string
  width: number
  align?: 'left' | 'center' | 'right'
  children?: GanttColumn[]
  mergeCell?: boolean
}
```

## ScaleType

```ts
type ScaleType = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
```

## LinkType

```ts
type LinkType = 'fs' | 'ss' | 'ff' | 'sf'
```

- `fs`：前置完成 → 后续开始
- `ss`：前置开始 → 后续开始
- `ff`：前置完成 → 后续完成
- `sf`：前置开始 → 后续完成

## FieldMap

```ts
interface FieldMap {
  id?: string
  name?: string
  start?: string
  end?: string
  progress?: string
  children?: string
}
```

## HolidayItem

```ts
interface HolidayItem {
  date: string | Date
  color?: string
  label?: string
}
```

## SnapConfig

```ts
interface SnapConfig {
  enabled?: boolean    // 默认 true
  step?: number        // 默认 1
  showGuide?: boolean  // 默认 true
}
```

## HeaderStyle

```ts
interface HeaderStyle {
  bgColor?: string
  textColor?: string
}
```

## BodyStyle

```ts
interface BodyStyle {
  bgColor?: string
  hoverColor?: string
  selectColor?: string
  textColor?: string
  todayColor?: string
  weekendColor?: string
}
```

## ExportOptions

```ts
interface ExportOptions {
  format: 'png' | 'csv' | 'json'
  background?: string
  delimiter?: string
  includeChildren?: boolean
}
```

## TaskSegment

```ts
interface TaskSegment {
  startDate: string | Date
  endDate: string | Date
  progress?: number
  color?: string
}
```

## ResourceAssignment

```ts
interface ResourceAssignment {
  name: string
  allocation?: number   // 0-100
  color?: string
}
```

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
