/**
 * @gantt-pro/react — 跨框架甘特图 React 适配层
 */

export { GanttChart } from './GanttChart'
export { TaskBar } from './TaskBar'
export { LinkLayer } from './LinkLayer'
export { useGanttStore } from './useGanttStore'
export { useGanttEngine } from './context'
export { GanttContext } from './context'

// 类型导出
export type { GanttChartProps, GanttRef, GanttChartCallbacks } from './types'

// 转发 core 的公共导出（方便使用者单包引入）
export {
  GanttEngine,
  Signal,
  Computed,
  batch,
  effect,
  signal,
  computed
} from '@gantt-pro/core'

export type {
  EngineOptions,
  RowItem,
  DragMode,
  GanttTask,
  GanttLink,
  GanttColumn,
  ScaleType,
  LinkType,
  FieldMap,
  GanttLabels,
  GanttLocale,
  TaskChangePayload,
  HolidayItem,
  SnapConfig,
  ExportOptions,
  HeaderStyle,
  BodyStyle
} from '@gantt-pro/core'

export { SCALE_ORDER, BUILTIN_LABELS } from '@gantt-pro/core'
