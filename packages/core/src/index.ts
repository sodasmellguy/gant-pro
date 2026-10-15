/**
 * @gantt-pro/core — 框架无关的甘特图核心逻辑层
 *
 * 不依赖 Vue / React 运行时，可被任意框架适配层消费。
 */

// 响应式原语
export { Signal, Computed, batch, effect, signal, computed, trackDeps } from './reactive'

// 核心引擎
export { GanttEngine } from './ganttEngine'
export type {
  EngineOptions, RowItem, DragMode, RescheduleChange,
  HistoryEntry, DragState
} from './ganttEngine'

// 几何计算
export {
  getPxPerDay, computeChartRange, createTimeConverter, barWidth,
  generateTopTicks, generateBottomTicks, generateWeekendCols, routeLink
} from './geometry'
export type { Tick, Geom, LinkPath } from './geometry'

// 关键路径
export { computeCriticalIds } from './criticalPath'
export type { DatesOfFn, WalkFn } from './criticalPath'

// 依赖顺推
export { rescheduleFrom, shiftTask } from './reschedule'

// 类型定义
export * from './types'

// 日期工具
export * from './date'

// 工作日历
export { createWorkCalendar, type WorkCalendar, type WorkCalendarConfig } from './workCalendar'

// 导出工具
export { exportGantt, exportCSV, exportJSON, exportPNG, downloadFile, flattenTasks } from './exporter'
