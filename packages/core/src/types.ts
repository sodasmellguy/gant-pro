export type { DateLike } from './date'

export type ScaleType = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

/** 刻度从细到粗的顺序，用于 Ctrl+滚轮逐级缩放 */
export const SCALE_ORDER: ScaleType[] = ['hour', 'day', 'week', 'month', 'quarter', 'year']

/** 依赖关系类型：F=完成(finish) S=开始(start)，fs 即“前置完成后续才能开始” */
export type LinkType = 'fs' | 'ss' | 'ff' | 'sf'

export interface GanttTask {
  id: string
  name: string
  /** 开始日期。小时刻度下支持 'YYYY-MM-DDTHH:mm' 格式带时间部分 */
  startDate?: string | Date
  /** 结束日期。小时刻度下支持 'YYYY-MM-DDTHH:mm' 格式带时间部分 */
  endDate?: string | Date
  /** 计划开始日期（基准线，配合 showBaseline 使用） */
  baselineStart?: string | Date
  /** 计划结束日期（基准线，配合 showBaseline 使用） */
  baselineEnd?: string | Date
  /** 负责人：姓名或 { name, color } */
  owner?: string | { name: string; color?: string }
  /** 0 - 100 */
  progress?: number
  /** 里程碑：以 startDate 为中心渲染菱形 */
  milestone?: boolean
  /** 初始折叠状态 */
  collapsed?: boolean
  /** 自定义条形颜色 */
  color?: string
  /** 条形动效：shimmer / pulse / flow */
  barEffect?: 'shimmer' | 'pulse' | 'flow'
  /** 任务状态：planned(计划) / active(进行中) / blocked(阻塞) / done(已完成) */
  status?: 'planned' | 'active' | 'blocked' | 'done'
  /** 预期进度（0-100，配合 showExpectedProgress 使用） */
  expectedProgress?: number
  /** 任务分段（一个任务拆成多段渲染，如中断后继续） */
  segments?: TaskSegment[]
  /** 资源分配（人员分配视图用） */
  resources?: ResourceAssignment[]
  children?: GanttTask[]
  [key: string]: any
}

/** 任务分段（如中断后继续） */
export interface TaskSegment {
  /** 分段开始日期 */
  startDate: string | Date
  /** 分段结束日期 */
  endDate: string | Date
  /** 分段进度（0-100，可选） */
  progress?: number
  /** 分段颜色（可选） */
  color?: string
}

export interface GanttLink {
  from: string
  to: string
  type?: LinkType
  color?: string
}

export interface GanttColumn {
  key: string
  label: string
  width: number
  align?: 'left' | 'center' | 'right'
  /** 子列：多级嵌套表头 */
  children?: GanttColumn[]
  /** 合并行标记：同列相邻行相同值时自动合并 */
  mergeCell?: boolean
}

/** 字段映射：适配既有数据结构，无需改造数据 */
export interface FieldMap {
  id?: string
  name?: string
  start?: string
  end?: string
  progress?: string
  children?: string
}

/** 支持的语言 */
export type GanttLocale = 'zh-CN' | 'en-US'

/** 国际化标签 */
export interface GanttLabels {
  taskName: string
  startDate: string
  endDate: string
  owner: string
  progress: string
  noData: string
  today: string
  weekend: string
  /** 刻度标签：年/季/月/周/日/时/上半年/下半年/Q1-Q4 等 */
  year: string
  quarter: string
  month: string
  week: string
  day: string
  hour: string
  firstHalf: string
  secondHalf: string
  /** 右键菜单标签 */
  deleteTask: string
  addLink: string
  copyDates: string
  snapHere: string
  /** 连线操作标签 */
  deleteLink: string
  changeLinkType: string
  /** 搜索 */
  searchPlaceholder: string
}

/** 内置 locale 表 */
export const BUILTIN_LABELS: Record<GanttLocale, GanttLabels> = {
  'zh-CN': {
    taskName: '任务名称',
    startDate: '开始日期',
    endDate: '结束日期',
    owner: '负责人',
    progress: '进度',
    noData: '暂无数据',
    today: '今天',
    weekend: '周末',
    year: '年',
    quarter: 'Q',
    month: '月',
    week: '周',
    day: '日',
    hour: '时',
    firstHalf: '上半年',
    secondHalf: '下半年',
    deleteTask: '删除任务',
    addLink: '添加依赖',
    copyDates: '复制日期',
    snapHere: '吸附到此位置',
    deleteLink: '删除连线',
    changeLinkType: '修改类型',
    searchPlaceholder: '搜索任务…'
  },
  'en-US': {
    taskName: 'Task Name',
    startDate: 'Start Date',
    endDate: 'End Date',
    owner: 'Owner',
    progress: 'Progress',
    noData: 'No Data',
    today: 'Today',
    weekend: 'Weekend',
    year: '',
    quarter: 'Q',
    month: '',
    week: 'W',
    day: '',
    hour: 'h',
    firstHalf: 'H1',
    secondHalf: 'H2',
    deleteTask: 'Delete Task',
    addLink: 'Add Dependency',
    copyDates: 'Copy Dates',
    snapHere: 'Snap Here',
    deleteLink: 'Delete Link',
    changeLinkType: 'Change Type',
    searchPlaceholder: 'Search tasks…'
  }
}

/** 自定义假日 */
export interface HolidayItem {
  date: string | Date
  color?: string
  label?: string
}

/** 表头样式配置 */
export interface HeaderStyle {
  /** 表头背景色 */
  bgColor?: string
  /** 表头文字颜色 */
  textColor?: string
}

/** 行体样式配置 */
export interface BodyStyle {
  /** 行背景色 */
  bgColor?: string
  /** 悬停背景色 */
  hoverColor?: string
  /** 选中背景色 */
  selectColor?: string
  /** 文字颜色 */
  textColor?: string
  /** 今日线颜色 */
  todayColor?: string
  /** 周末背景色 */
  weekendColor?: string
}

/** 吸附对齐配置 */
export interface SnapConfig {
  /** 启用吸附（默认 true） */
  enabled?: boolean
  /** 吸附步长（天，默认 1；hour 刻度下单位为小时） */
  step?: number
  /** 显示吸附参考线（默认 true） */
  showGuide?: boolean
}

/** 右键菜单项 */
export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  /** 分隔线 */
  divider?: boolean
  /** 禁用 */
  disabled?: boolean
}

/** 导出配置 */
export interface ExportOptions {
  /** 导出格式 */
  format: 'png' | 'csv' | 'json'
  /** PNG 背景（默认透明） */
  background?: string
  /** CSV 分隔符（默认逗号） */
  delimiter?: string
  /** 是否包含子任务 */
  includeChildren?: boolean
  /** PNG 导出分辨率倍数（默认 2x） */
  scale?: number
}

/** 多图联动配置 */
export interface GanttSyncConfig {
  /** 同步滚动 */
  scroll?: boolean
  /** 同步缩放 */
  scale?: boolean
  /** 同步选择 */
  selection?: boolean
  /** 同步展开/折叠 */
  expand?: boolean
}

/** 资源分配 */
export interface ResourceAssignment {
  /** 负责人/资源名称 */
  name: string
  /** 分配比例 0-100 */
  allocation?: number
  /** 颜色 */
  color?: string
}

export type DragMode = 'move' | 'left' | 'right' | 'progress'

/** 行拖拽排序事件 */
export interface RowMovePayload {
  task: GanttTask
  fromIndex: number
  toIndex: number
  parentId: string | null
}

/** 变更类型：拖拽四种 + 行内编辑 */
export type TaskChangeMode = DragMode | 'edit'

export interface TaskChangePayload {
  task: GanttTask
  mode: TaskChangeMode
  oldStartDate?: string | Date
  oldEndDate?: string | Date
  oldProgress?: number
  /** 行内编辑改名前的旧名称（mode: 'edit'） */
  oldName?: string
}
