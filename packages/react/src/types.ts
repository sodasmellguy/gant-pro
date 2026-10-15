/**
 * React 适配层类型定义
 */
import type {
  GanttTask, GanttLink, GanttColumn, ScaleType,
  FieldMap, HolidayItem, SnapConfig, GanttLabels,
  GanttLocale, TaskChangePayload, RescheduleChange,
  HeaderStyle, BodyStyle, ResourceAssignment, LinkType
} from '@gantt-pro/core'
import type { DragMode, Geom } from '@gantt-pro/core'
import type { ReactNode } from 'react'

export interface GanttChartProps extends GanttChartCallbacks {
  /** 任务树 */
  data: GanttTask[]
  /** data 变更回调 */
  onDataChange?: (data: GanttTask[]) => void
  /** 依赖连线 */
  links?: GanttLink[]
  /** links 变更回调 */
  onLinksChange?: (links: GanttLink[]) => void
  /** 左侧表格列配置 */
  columns?: GanttColumn[]
  /** 时间刻度 */
  scale?: ScaleType
  rowHeight?: number
  barHeight?: number
  headerHeight?: number
  /** 只读 */
  readonly?: boolean
  /** 显示基准线 */
  showBaseline?: boolean
  /** 依赖顺推 */
  autoReschedule?: boolean
  /** 负责人筛选 */
  filterOwner?: string | null
  /** 关键路径 */
  showCriticalPath?: boolean
  /** 小时刻度像素宽 */
  hourWidth?: number
  /** 父子联动缩放 */
  linkedResize?: boolean
  /** 行拖拽排序 */
  rowDraggable?: boolean
  /** 字段映射 */
  fieldMap?: Partial<FieldMap>
  /** 自定义假日 */
  holidays?: HolidayItem[]
  /** 层级背景色 */
  levelColor?: boolean | string[]
  /** 吸附对齐 */
  snap?: boolean | SnapConfig
  /** 预期进度 */
  showExpectedProgress?: boolean
  /** 时间范围 */
  rangeStart?: string | Date | null
  rangeEnd?: string | Date | null
  /** 按单位移动 */
  moveByUnit?: boolean
  /** 进度小数位 */
  progressDecimal?: number
  /** 暗色主题 */
  dark?: boolean
  /** 主题色 */
  primaryColor?: string
  /** 语言 */
  locale?: GanttLocale
  /** 标签覆盖 */
  labels?: Partial<GanttLabels>
  /** 表头样式 */
  headerStyle?: HeaderStyle
  /** 行体样式 */
  bodyStyle?: BodyStyle
  /** 允许连线 */
  allowLink?: boolean
  /** 空数据提示 */
  emptyData?: string
  /** 日期格式 */
  dateFormat?: string
  /** 进度条颜色 */
  progressColor?: string
  /** 条形对齐 */
  barAlignment?: 'left' | 'center' | 'right'
  /** 搜索关键词 */
  search?: string
  /** 启用框选多选 */
  boxSelect?: boolean
  /** 启用任务详情侧边栏（双击行打开） */
  showTaskDetail?: boolean
  /** 拖拽时吸附到其他任务条边缘（px 阈值） */
  snapToTask?: number
  /** 滚轮缩放 */
  zoomOnWheel?: boolean
  /** 显示今日线 */
  showToday?: boolean
  /** 显示分隔线 */
  showDivider?: boolean
  /** 显示周末背景 */
  showWeekend?: boolean
  /** 列可调宽 */
  resizableColumns?: boolean
  /** 显示 Checkbox 选择列 */
  showCheckbox?: boolean
  /** 行内编辑：双击任务名称 / 进度单元格直接修改 */
  editable?: boolean
  /** 右键菜单：true 使用内置菜单，函数为自定义回调 */
  contextMenu?: boolean | ((task: GanttTask, e: MouseEvent) => void)
  /** 层级色 */
  levelColorFlag?: boolean
  /** 父子联动 */
  linkedResizeFlag?: boolean
  /** 行双击事件 */
  rowDblClick?: boolean
  /** 悬停高亮 */
  highlightDate?: boolean
  /** 点击行时自动滚动条形到可见区 */
  sliderIntoView?: boolean
  /** 视口外任务定位指示器 */
  offScreenIndicator?: boolean
  /** 主题预设：blue / green / purple / orange */
  theme?: 'blue' | 'green' | 'purple' | 'orange'
  /** 条形内容插槽模式 */
  barSlot?: boolean
  /** 显示资源面板 */
  showResourcePanel?: boolean
  /** 条形内容渲染函数（barSlot=true 时生效） */
  renderBarContent?: (task: GanttTask, geom: Geom, progress: number) => ReactNode
  /** 自定义列单元格渲染函数（返回 ReactNode 替代默认文本） */
  renderCell?: (task: GanttTask, columnKey: string, value: string) => ReactNode
  /** 自定义列头渲染函数 */
  renderHeader?: (column: GanttColumn) => ReactNode
  /** 自定义顶部刻度标签渲染 */
  renderScaleTopLabel?: (tick: { label: string; left: number; width: number; date?: Date }) => ReactNode
  /** 自定义底部刻度标签渲染 */
  renderScaleBottomLabel?: (tick: { label: string; left: number; width: number; weekend?: boolean; date?: Date }) => ReactNode
}

export interface GanttChartCallbacks {
  onTaskChange?: (p: TaskChangePayload) => void
  onLinkCreate?: (p: { from: string; to: string }) => void
  onLinkClick?: (l: GanttLink) => void
  onLinkDelete?: (l: GanttLink) => void
  onLinkTypeChange?: (l: GanttLink, type: LinkType) => void
  onLinkReconnect?: (l: GanttLink, side: 'from' | 'to', newTaskId: string) => void
  onLinkDblClick?: (l: GanttLink) => void
  onRowClick?: (t: GanttTask) => void
  onRowDblClick?: (t: GanttTask) => void
  onExpand?: (t: GanttTask, expanded: boolean) => void
  onReschedule?: (changes: RescheduleChange[]) => void
  onRowMove?: (p: { task: GanttTask; fromIndex: number; toIndex: number; parentId: string | null }) => void
  onScaleChange?: (scale: ScaleType) => void
  onVisibleRangeChange?: (range: { start: Date; end: Date }) => void
  onSelectionChange?: (ids: string[]) => void
  onContextMenu?: (p: { task: GanttTask; x: number; y: number }) => void
  onUndo?: (entry: any) => void
  onRedo?: (entry: any) => void
}

export interface GanttRef {
  undo: () => void
  redo: () => void
  scrollToToday: (opts?: { animate?: boolean }) => void
  scrollToTask: (id: string, opts?: { animate?: boolean }) => void
  jumpToDate: (date?: string | Date, opts?: { animate?: boolean }) => void
  print: () => void
  exportData: (options: { format: 'png' | 'csv' | 'json' }) => Promise<any>
  getSelected: () => Set<string>
  selectAll: (v: boolean) => void
}
