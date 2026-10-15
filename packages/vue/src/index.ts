import type { App } from 'vue'
import GanttChart from './GanttChart.vue'
import './gantt.css'

export { GanttChart, GanttChart as default }

// 从 @gantt-pro/core 转发公共导出（类型 + 工具函数）
export {
  SCALE_ORDER,
  BUILTIN_LABELS,
  type GanttTask,
  type GanttLink,
  type GanttColumn,
  type ScaleType,
  type LinkType,
  type FieldMap,
  type GanttLabels,
  type GanttLocale,
  type TaskChangePayload,
  type HolidayItem,
  type SnapConfig,
  type ExportOptions,
  type HeaderStyle,
  type BodyStyle,
  type DateLike,
  type DragMode,
  fmt,
  startOfDay,
  toDate,
  toDateWithTime,
  addDays,
  addHours,
  diffDays,
  diffHours,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfHalfYear,
  daysInMonth,
  isWeekend,
  maxDate,
  minDate,
  MS_DAY,
  MS_HOUR,
  createWorkCalendar,
  type WorkCalendar,
  type WorkCalendarConfig,
  exportGantt,
  exportCSV,
  exportJSON,
  exportPNG,
  downloadFile,
  flattenTasks,
  getPxPerDay,
  computeChartRange,
  createTimeConverter,
  barWidth,
  generateTopTicks,
  generateBottomTicks,
  generateWeekendCols,
  routeLink,
  type Tick,
  type Geom,
  type LinkPath
} from '@gantt-pro/core'

export { createGanttSyncHub, type GanttSyncHub, type GanttSyncInstance } from './GanttSync'

export function install(app: App) {
  app.component('GanttChart', GanttChart)
}
