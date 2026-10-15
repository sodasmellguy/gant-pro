<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  toRef,
  watch,
  watchEffect,
  type Ref
} from 'vue'
import { createGanttStore, GANTT_KEY } from './store'
import TaskBar from './TaskBar.vue'
import LinkLayer from './LinkLayer.vue'
import {
  SCALE_ORDER,
  BUILTIN_LABELS,
  type GanttColumn,
  type GanttLabels,
  type GanttLocale,
  type GanttLink,
  type GanttTask,
  type ScaleType,
  type FieldMap,
  type HolidayItem,
  type SnapConfig,
  type ContextMenuItem,
  type HeaderStyle,
  type BodyStyle,
  fmt,
  startOfDay,
  toDate,
  exportGantt
} from '@gantt-pro/core'

const props = withDefaults(
  defineProps<{
    /** 任务树，支持 v-model:data */
    data: GanttTask[]
    /** 依赖连线 */
    links?: GanttLink[]
    /** 左侧表格列配置 */
    columns?: GanttColumn[]
    /** 时间刻度（支持 v-model:scale 受控模式） */
    scale?: ScaleType
    rowHeight?: number
    barHeight?: number
    headerHeight?: number
    /** 只读：禁用拖拽与连线创建 */
    readonly?: boolean
    /** 显示基准线（计划 vs 实际对比，需要任务带 baselineStart/baselineEnd） */
    showBaseline?: boolean
    /** 拖拽提交后按依赖链自动顺推后续任务（fs/ss/ff/sf） */
    autoReschedule?: boolean
    /** 负责人筛选：只显示该负责人的任务及其父链（配合任务 owner 字段） */
    filterOwner?: string | null
    /** 高亮关键路径（CPM：浮时 <= 0 的任务与依赖线标红） */
    showCriticalPath?: boolean
    /** 行内编辑：双击任务名称 / 进度单元格直接修改 */
    editable?: boolean
    dark?: boolean
    primaryColor?: string
    showToday?: boolean
    showWeekend?: boolean
    /** 允许从条形锚点拖拽创建依赖 */
    allowLink?: boolean
    /** 时间区内 Ctrl + 滚轮逐级缩放刻度（以鼠标位置为锚点） */
    zoomOnWheel?: boolean
    /** 小时刻度下每小时像素宽度（默认 24，即 576px/天） */
    hourWidth?: number
    /** 点击行时自动滚动条形到可见区 */
    sliderIntoView?: boolean
    /** 父子联动缩放：拖叶子时父条自动扩展 */
    linkedResize?: boolean
    /** 行拖拽排序 */
    rowDraggable?: boolean
    /** 字段映射 */
    fieldMap?: Partial<FieldMap>
    /** 自定义假日 */
    holidays?: HolidayItem[]
    /** 层级行背景色 */
    levelColor?: boolean | string[]
    /** 显示 Checkbox 选择列 */
    showCheckbox?: boolean
    /** 显示表格/时间区分隔线 */
    showDivider?: boolean
    /** 可拖拽调宽的列 */
    resizableColumns?: boolean
    /** 国际化语言 */
    locale?: GanttLocale
    /** 国际化标签覆盖 */
    labels?: Partial<GanttLabels>
    /** 条形内容插槽模式（slot name 前缀） */
    barSlot?: boolean
    /** 吸附对齐：拖拽时按步长吸附日期。true=默认1天/小时，可传 { step, showGuide } 自定义 */
    snap?: boolean | SnapConfig
    /** 右键菜单：传入回调则启用，传入 true 使用内置默认菜单 */
    contextMenu?: ((task: GanttTask, e: MouseEvent) => void) | boolean
    /** 视口外任务定位指示器 */
    offScreenIndicator?: boolean
    /** 无限滚动填充（时间线左右延伸缓冲天数） */
    infinitePadding?: number | false
    /** 显示资源面板 */
    showResourcePanel?: boolean
    /** 自定义刻度（ViewMode API：自定义 step/format） */
    customScale?: { step?: number; labelFormat?: string } | false
    /** 主题预设：blue / green / purple / orange */
    theme?: 'blue' | 'green' | 'purple' | 'orange'
    /** 预期进度对比：显示预期进度标记线 */
    showExpectedProgress?: boolean
    /** 时间范围控制：限制图表只显示此范围 */
    rangeStart?: string | Date | null
    rangeEnd?: string | Date | null
    /** 表头样式 */
    headerStyle?: HeaderStyle
    /** 行体样式 */
    bodyStyle?: BodyStyle
    /** 按刻度单位移动（拖拽时吸附到刻度网格） */
    moveByUnit?: boolean
    /** 行双击事件 */
    rowDblClick?: boolean
    /** 悬停行时高亮对应刻度格 */
    highlightDate?: boolean
    /** 空数据提示文本 */
    emptyData?: string
    /** 列日期格式（如 'MM-DD' / 'YYYY-MM-DD'） */
    dateFormat?: string
    /** 进度小数位数（0-10，默认 0 即整数） */
    progressDecimal?: number
    /** 进度条颜色 */
    progressColor?: string
    /** 条形对齐方式 */
    barAlignment?: 'left' | 'center' | 'right'
    /** 任务搜索关键词（高亮匹配名称的任务行） */
    search?: string
    /** 启用框选多选（拖拽空白区域绘制选框选择任务） */
    boxSelect?: boolean
    /** 启用任务详情侧边栏（双击行打开） */
    showTaskDetail?: boolean
    /** 拖拽时吸附到其他任务条边缘（px 阈值，如 8 表示 8px 内吸附） */
    snapToTask?: number
  }>(),
  {
    links: () => [],
    columns: () => [
      { key: 'name', label: '任务名称', width: 220 },
      { key: 'startDate', label: '开始日期', width: 88, align: 'center' },
      { key: 'endDate', label: '结束日期', width: 88, align: 'center' },
      { key: 'owner', label: '负责人', width: 76, align: 'center' },
      { key: 'progress', label: '进度', width: 70, align: 'center' }
    ],
    scale: 'day',
    rowHeight: 36,
    barHeight: 24,
    headerHeight: 56,
    readonly: false,
    showBaseline: false,
    autoReschedule: false,
    filterOwner: null,
    showCriticalPath: false,
    editable: false,
    dark: false,
    primaryColor: '',
    showToday: true,
    showWeekend: true,
    allowLink: true,
    zoomOnWheel: true,
    hourWidth: 24,
    sliderIntoView: false,
    linkedResize: false,
    rowDraggable: false,
    fieldMap: () => ({}),
    holidays: () => [],
    levelColor: false,
    showCheckbox: false,
    showDivider: true,
    resizableColumns: false,
    locale: 'zh-CN',
    labels: () => ({}),
    barSlot: false,
    snap: true,
    contextMenu: false,
    offScreenIndicator: true,
    infinitePadding: 30,
    showResourcePanel: false,
    customScale: false,
    theme: 'blue',
    showExpectedProgress: false,
    rangeStart: null,
    rangeEnd: null,
    headerStyle: () => ({}),
    bodyStyle: () => ({}),
    moveByUnit: false,
    rowDblClick: false,
    highlightDate: false,
    emptyData: '',
    dateFormat: 'MM-DD',
    progressDecimal: 0,
    progressColor: '',
    barAlignment: 'center',
    search: '',
    boxSelect: false,
    showTaskDetail: false,
    snapToTask: 0
  }
)

const emit = defineEmits([
  'update:data',
  'update:scale',
  'update:links',
  'scale-change',
  'task-change',
  'reschedule',
  'undo',
  'redo',
  'task-click',
  'row-click',
  'link-click',
  'link-create',
  'expand',
  'row-move',
  'selection-change',
  'context-menu',
  'visible-range-change',
  'row-dbl-click',
  'link-delete',
  'link-type-change',
  'link-reconnect'
])

// scale 受控/非受控双模式：外部传 v-model:scale 则双向同步，否则组件内部自管
const innerScale = ref<ScaleType>(props.scale)
watch(
  () => props.scale,
  (v) => {
    if (v !== innerScale.value) {
      captureCenterTime()
      innerScale.value = v
      restoreCenterPos()
    }
  }
)

// scale 不受控时内部切换也保持位置
function setScale(s: ScaleType) {
  if (s === innerScale.value) return
  captureCenterTime()
  innerScale.value = s
  emit('update:scale', s)
  emit('scale-change', s)
  restoreCenterPos()
}

// ---------------- 刻度切换保持位置（maintain_pos） ----------------
/** 缩放前记录屏幕中心对应的时间戳，缩放后恢复 */
let maintainPosTime: number | null = null
function captureCenterTime() {
  const hs = hscrollRef.value
  const clip = timeClipRef.value
  if (!hs || !clip) return
  const centerX = hs.scrollLeft + clip.clientWidth / 2
  maintainPosTime = store.xToTime(centerX)
}
function restoreCenterPos() {
  if (maintainPosTime == null) return
  const hs = hscrollRef.value
  const clip = timeClipRef.value
  if (!hs || !clip) {
    maintainPosTime = null
    return
  }
  nextTick(() => {
    const newX = store.timeToX(maintainPosTime!)
    hs.scrollLeft = Math.max(0, Math.round(newX - clip.clientWidth / 2))
    scrollLeft.value = hs.scrollLeft
    maintainPosTime = null
  })
}

// ---------------- 国际化标签（在 store 之前定义，因 store 需要引用） ----------------
const i18n = computed<GanttLabels>(() => ({
  ...BUILTIN_LABELS[props.locale],
  ...props.labels
}))

const store = createGanttStore(toRef(props, 'data'), {
  scale: innerScale,
  rowHeight: toRef(props, 'rowHeight'),
  barHeight: toRef(props, 'barHeight'),
  readonly: toRef(props, 'readonly'),
  allowLink: toRef(props, 'allowLink'),
  showBaseline: toRef(props, 'showBaseline'),
  autoReschedule: toRef(props, 'autoReschedule'),
  filterOwner: toRef(props, 'filterOwner'),
  showCriticalPath: toRef(props, 'showCriticalPath'),
  hourWidth: toRef(props, 'hourWidth'),
  linkedResize: toRef(props, 'linkedResize'),
  rowDraggable: toRef(props, 'rowDraggable'),
  fieldMap: toRef(props, 'fieldMap'),
  holidays: toRef(props, 'holidays'),
  levelColor: toRef(props, 'levelColor'),
  links: toRef(props, 'links'),
  snap: toRef(props, 'snap'),
  onContextMenu: ref(null),
  showExpectedProgress: toRef(props, 'showExpectedProgress'),
  rangeStart: toRef(props, 'rangeStart'),
  rangeEnd: toRef(props, 'rangeEnd'),
  moveByUnit: toRef(props, 'moveByUnit'),
  progressDecimal: toRef(props, 'progressDecimal'),
  labels: i18n as Ref<GanttLabels>,
  snapToTask: toRef(props, 'snapToTask')
})
provide(GANTT_KEY, store)

store.onCommit((p) => {
  emit('task-change', p)
  emit('update:data', store.inner.value)
})
store.onReschedule((changes) => {
  emit('reschedule', changes)
  emit('update:data', store.inner.value)
})
store.onLinkCreate((p) => emit('link-create', p))
store.onLinkClick((l) => emit('link-click', l))
store.onLinkDelete((l) => {
  emit('link-delete', l)
})
store.onLinkTypeChange((p) => {
  emit('link-type-change', p)
})
store.onLinkReconnect((p) => {
  emit('link-reconnect', p)
})
store.onExpand((t, v) => emit('expand', t, v))
store.onRowMove((p) => {
  emit('row-move', p)
  emit('update:data', store.inner.value)
})

// 右键菜单
const ctxMenu = reactive({ visible: false, x: 0, y: 0, task: null as GanttTask | null })
// 添加依赖模式：右键菜单选择“添加依赖”后进入此模式
const linkSourceId = ref<string | null>(null)
const ctxItems = computed<ContextMenuItem[]>(() => {
  if (!ctxMenu.task) return []
  const L = i18n.value
  return [
    { id: 'delete', label: L.deleteTask },
    { id: 'add-link', label: L.addLink },
    { id: 'copy-dates', label: L.copyDates },
    { id: 'snap-here', label: L.snapHere }
  ]
})
function onContextMenu(task: GanttTask, e: MouseEvent) {
  e.preventDefault()
  ctxMenu.visible = true
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.task = task
  if (typeof props.contextMenu === 'function') {
    props.contextMenu(task, e)
  } else {
    emit('context-menu', { task, x: e.clientX, y: e.clientY })
  }
}
// 设置 store 的右键回调
watchEffect(() => {
  store.onContextMenu.value = onContextMenu
})
function closeCtxMenu() {
  ctxMenu.visible = false
  ctxMenu.task = null
}
function onCtxClick(item: ContextMenuItem) {
  if (!ctxMenu.task) return
  const task = ctxMenu.task
  switch (item.id) {
    case 'delete':
      store.deleteTask(task.id)
      emit('update:data', store.inner.value)
      break
    case 'add-link':
      // 进入连线创建模式：设置源任务，提示用户点击目标任务
      linkSourceId.value = task.id
      store.selectedId.value = task.id
      break
    case 'copy-dates':
      if (navigator.clipboard) {
        const text = `${task.startDate ?? ''} ~ ${task.endDate ?? ''}`
        navigator.clipboard.writeText(text)
      }
      break
    case 'snap-here':
      // 将任务吸附到当前右键位置（预留）
      break
  }
  closeCtxMenu()
}

watch(
  () => store.selectedId.value,
  (id) => {
    if (!id) return
    const t = store.findTask(id)
    if (t) emit('task-click', t)
  }
)

// ---------------- 布局 ----------------
const contentWidth = store.contentWidth

const bodyRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const hscrollRef = ref<HTMLElement>()
const timeClipRef = ref<HTMLElement>()
const scrollTop = ref(0)
const scrollLeft = ref(0)
const viewH = ref(320)

function onBodyScroll() {
  scrollTop.value = bodyRef.value?.scrollTop ?? 0
}
function onHScroll() {
  scrollLeft.value = hscrollRef.value?.scrollLeft ?? 0
}

// ---------------- 动画滚动 ----------------
/** 是否尊重 prefers-reduced-motion（用户偏好减少动画时自动降级为直接跳转） */
const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** rAF 缓动滚动：同时支持水平 + 垂直 */
function animateScroll(el: HTMLElement, target: { left?: number; top?: number }, duration = 300) {
  const startLeft = el.scrollLeft
  const startTop = el.scrollTop
  const dl = target.left != null ? target.left - startLeft : 0
  const dt = target.top != null ? target.top - startTop : 0
  if (dl === 0 && dt === 0) return
  const start = performance.now()
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2) // easeInOutQuad
  function step(now: number) {
    const p = Math.min(1, (now - start) / duration)
    const e = ease(p)
    if (dl !== 0) el.scrollLeft = startLeft + dl * e
    if (dt !== 0) el.scrollTop = startTop + dt * e
    if (p < 1) requestAnimationFrame(step)
    else {
      if (dl !== 0) el.scrollLeft = startLeft + dl
      if (dt !== 0) el.scrollTop = startTop + dt
    }
  }
  requestAnimationFrame(step)
}

/** 执行滚动（带动画降级判断） */
function doScroll(
  hs: HTMLElement,
  body: HTMLElement | undefined,
  opts: { left: number; top?: number; animate?: boolean }
) {
  const useAnim = opts.animate !== false && !prefersReducedMotion
  if (useAnim) {
    animateScroll(hs, { left: opts.left })
    if (body && opts.top != null) animateScroll(body, { top: opts.top })
  } else {
    hs.scrollLeft = opts.left
    if (body && opts.top != null) body.scrollTop = opts.top
  }
}

/** Ctrl + 滚轮：小时->日->周->月->季->年逐级缩放，以鼠标指向的日期为锚点（尽量停留在原屏幕位置） */
function zoomAt(e: WheelEvent) {
  const idx = SCALE_ORDER.indexOf(innerScale.value)
  if (idx < 0) return
  const next = SCALE_ORDER[Math.max(0, Math.min(SCALE_ORDER.length - 1, idx + (e.deltaY > 0 ? 1 : -1)))]
  if (next === innerScale.value) return
  const clip = timeClipRef.value
  const content = contentRef.value
  const hs = hscrollRef.value
  if (!clip || !content || !hs) {
    setScale(next)
    return
  }
  // 使用统一几何换算：鼠标位置 -> 时间戳（缩放前）-> 新 x（缩放后）
  const contentRect = content.getBoundingClientRect()
  const mouseX = e.clientX - contentRect.left + hs.scrollLeft // 鼠标在内容中的 x 坏标
  const mouseTime = store.xToTime(mouseX) // 对应时间戳
  const viewX = e.clientX - clip.getBoundingClientRect().left
  setScale(next)
  // 等像素密度与内容宽度更新后再补偿滚动位置
  nextTick(() => {
    const newX = store.timeToX(mouseTime)
    hs.scrollLeft = Math.max(0, Math.round(newX - viewX))
    scrollLeft.value = hs.scrollLeft
  })
}

function onWheel(e: WheelEvent) {
  if (e.ctrlKey && props.zoomOnWheel) {
    e.preventDefault()
    zoomAt(e)
    return
  }
  const hs = hscrollRef.value
  if (!hs) return
  const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
  if (dx) {
    e.preventDefault()
    hs.scrollLeft += dx
  }
}

// ---------------- 双指捏合缩放（pinch zoom） ----------------
let pinchPrevDist: number | null = null
function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    pinchPrevDist = pinchDistance(e.touches)
  }
}
function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2 && pinchPrevDist != null && props.zoomOnWheel) {
    e.preventDefault()
    const dist = pinchDistance(e.touches)
    const ratio = dist / pinchPrevDist
    if (Math.abs(ratio - 1) > 0.06) {
      const idx = SCALE_ORDER.indexOf(innerScale.value)
      const direction = ratio > 1 ? -1 : 1
      const next = SCALE_ORDER[Math.max(0, Math.min(SCALE_ORDER.length - 1, idx + direction))]
      if (next !== innerScale.value) {
        const clip = timeClipRef.value
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const viewX = cx - (clip?.getBoundingClientRect().left ?? 0)
        const mouseTime = store.xToTime(cx - (contentRef.value?.getBoundingClientRect().left ?? 0) + scrollLeft.value)
        setScale(next)
        nextTick(() => {
          const hs = hscrollRef.value
          if (!hs) return
          const newX = store.timeToX(mouseTime)
          hs.scrollLeft = Math.max(0, Math.round(newX - viewX))
          scrollLeft.value = hs.scrollLeft
        })
      }
      pinchPrevDist = dist
    }
  }
}
function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) pinchPrevDist = null
}
function pinchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

// ---------------- 撤销 / 重做 / 定位（defineExpose 暴露） ----------------
function undo() {
  const entry = store.undo()
  if (entry) {
    emit('undo', entry)
    emit('update:data', store.inner.value)
  }
}
function redo() {
  const entry = store.redo()
  if (entry) {
    emit('redo', entry)
    emit('update:data', store.inner.value)
  }
}
function scrollToToday(opts?: { animate?: boolean }) {
  const tx = store.todayX.value
  const hs = hscrollRef.value
  const clip = timeClipRef.value
  if (tx < 0 || !hs || !clip) return
  const target = Math.max(0, tx - clip.clientWidth / 2)
  doScroll(hs, undefined, { left: target, animate: opts?.animate })
  scrollLeft.value = hs.scrollLeft
}
function scrollToTask(id: string, opts?: { animate?: boolean }) {
  const g = store.geoms.value.get(id)
  const hs = hscrollRef.value
  const clip = timeClipRef.value
  const body = bodyRef.value
  if (!g || !hs || !clip || !body) return
  const targetLeft = Math.max(0, g.x + g.w / 2 - clip.clientWidth / 2)
  const targetTop = Math.max(0, g.y - body.clientHeight / 2)
  doScroll(hs, body, { left: targetLeft, top: targetTop, animate: opts?.animate })
  scrollLeft.value = hs.scrollLeft
}
/** 跳转到指定日期：目标日期格居中；缺省 = 今天 */
function jumpToDate(date?: string | Date, opts?: { animate?: boolean }) {
  const hs = hscrollRef.value
  const clip = timeClipRef.value
  if (!hs || !clip) return
  const targetDate = date ? toDate(date as any) : startOfDay(new Date())
  // 超出范围时 clamp 到边界
  const cs = store.chartStart.value
  const ce = store.chartEnd.value
  const d = targetDate < cs ? cs : targetDate > ce ? ce : targetDate
  const targetX = store.timeToX(d.getTime())
  const targetLeft = Math.max(0, targetX - clip.clientWidth / 2)
  doScroll(hs, undefined, { left: targetLeft, animate: opts?.animate })
  scrollLeft.value = hs.scrollLeft
}
// ---------------- 任务搜索高亮 ----------------
const searchMatchIds = computed<Set<string>>(() => {
  const q = props.search?.trim().toLowerCase()
  if (!q) return new Set()
  const result = new Set<string>()
  const walk = (tasks: GanttTask[]) => {
    for (const t of tasks) {
      if (t.name?.toLowerCase().includes(q)) result.add(t.id)
      if (t.children) walk(t.children)
    }
  }
  walk(store.inner.value)
  return result
})

// ---------------- 打印优化 ----------------
function print() {
  // 展开所有任务确保完整可见
  store.expandAll(true)
  nextTick(() => {
    window.print()
  })
}

// ---------------- 无障碍（a11y）键盘导航 ----------------
function onKeydown(e: KeyboardEvent) {
  const rows = store.flatRows.value
  if (!rows.length) return
  const currentId = store.selectedId.value
  const currentIdx = currentId ? rows.findIndex((r) => r.task.id === currentId) : -1
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    const nextIdx = currentIdx < 0 ? 0 : Math.min(rows.length - 1, currentIdx + 1)
    store.selectedId.value = rows[nextIdx].task.id
    // 滚动到可见
    const body = bodyRef.value
    if (body) body.scrollTop = nextIdx * props.rowHeight - body.clientHeight / 2
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    const prevIdx = currentIdx < 0 ? 0 : Math.max(0, currentIdx - 1)
    store.selectedId.value = rows[prevIdx].task.id
    const body = bodyRef.value
    if (body) body.scrollTop = prevIdx * props.rowHeight - body.clientHeight / 2
  } else if (e.key === 'Enter') {
    if (currentId) {
      const t = store.findTask(currentId)
      if (t) emit('row-click', t)
    }
  } else if (e.key === ' ' && currentId) {
    e.preventDefault()
    const t = store.findTask(currentId)
    if (t) {
      const kids = t.children
      if (kids?.length) store.toggleExpand(t)
    }
  }
}

defineExpose({
  undo,
  redo,
  scrollToToday,
  scrollToTask,
  jumpToDate,
  print,
  canUndo: computed(() => store.canUndo.value),
  canRedo: computed(() => store.canRedo.value),
  getSelected: () => selectedIds.value,
  selectAll: (v: boolean) => {
    selectedIds.value = v ? new Set(store.flatRows.value.map((r) => r.task.id)) : new Set()
  },
  /** 导出甘特图 */
  exportData: async (options: { format: 'png' | 'csv' | 'json' }) => {
    return exportGantt(store.inner.value, contentRef.value ?? null, options as any)
  }
})

// ---------------- Checkbox 多选 ----------------
const selectedIds = ref<Set<string>>(new Set())
watch(selectedIds, (v) => emit('selection-change', [...v]), { deep: true })
function toggleSelect(id: string) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}
function toggleSelectAll() {
  const all = store.flatRows.value
  const s = new Set(selectedIds.value)
  const allSelected = all.every((r) => s.has(r.task.id))
  if (allSelected) all.forEach((r) => s.delete(r.task.id))
  else all.forEach((r) => s.add(r.task.id))
  selectedIds.value = s
}
const allSelected = computed(() => {
  const all = store.flatRows.value
  return all.length > 0 && all.every((r) => selectedIds.value.has(r.task.id))
})
const someSelected = computed(() => {
  const s = selectedIds.value
  const all = store.flatRows.value
  return all.some((r) => s.has(r.task.id)) && !allSelected.value
})

// ---------------- 列宽拖拽调宽 ----------------
const columnWidths = reactive<Record<string, number>>({})
function colWidth(c: GanttColumn): number {
  return columnWidths[c.key] ?? c.width
}
const tableWidthLive = computed(() => props.columns.reduce((s, c) => s + colWidth(c), 0))
let resizeCol: { key: string; startX: number; startW: number } | null = null
function onColResizeDown(e: PointerEvent, c: GanttColumn) {
  if (!props.resizableColumns) return
  e.preventDefault()
  e.stopPropagation()
  resizeCol = { key: c.key, startX: e.clientX, startW: colWidth(c) }
  const move = (ev: PointerEvent) => {
    if (!resizeCol) return
    const dx = ev.clientX - resizeCol.startX
    columnWidths[resizeCol.key] = Math.max(40, resizeCol.startW + dx)
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    resizeCol = null
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ---------------- 行拖拽排序 ----------------
const dragRowId = ref<string | null>(null)
const dragOverIndex = ref<number | null>(null)
function onRowDragStart(e: DragEvent, task: GanttTask) {
  if (!props.rowDraggable || props.readonly) return
  dragRowId.value = task.id
  e.dataTransfer?.setData('text/plain', task.id)
}
function onRowDragOver(e: DragEvent, index: number) {
  if (!props.rowDraggable || !dragRowId.value) return
  e.preventDefault()
  dragOverIndex.value = index
}
function onRowDrop(e: DragEvent, index: number) {
  e.preventDefault()
  const id = dragRowId.value
  dragRowId.value = null
  dragOverIndex.value = null
  if (!id) return
  const t = store.findTask(id)
  if (!t) return
  const result = store.moveRow(id, index)
  if (result) emit('row-move', { task: t, ...result })
}

function labelOf(c: GanttColumn): string {
  const map: Record<string, keyof GanttLabels> = {
    name: 'taskName',
    startDate: 'startDate',
    endDate: 'endDate',
    owner: 'owner',
    progress: 'progress'
  }
  const key = map[c.key]
  return key ? i18n.value[key] : c.label
}

// ---------------- 多级嵌套表头 ----------------
/** 扁平化列树，计算列的 span 和 level */
interface FlatCol {
  col: GanttColumn
  level: number
  rowSpan: number
  colSpan: number
  leafIndex: number
}

function flattenColumns(cols: GanttColumn[], level = 0): FlatCol[] {
  const res: FlatCol[] = []
  const walk = (c: GanttColumn, lvl: number): number => {
    if (!c.children?.length) {
      res.push({ col: c, level: lvl, rowSpan: maxLevel - lvl, colSpan: 1, leafIndex: -1 })
      return 1
    }
    let span = 0
    for (const child of c.children) span += walk(child, lvl + 1)
    res.unshift({ col: c, level: lvl, rowSpan: 1, colSpan: span, leafIndex: -1 })
    return span
  }
  for (const c of cols) walk(c, level)
  // 计算 maxLevel
  let maxLvl = 0
  for (const fc of res) if (fc.rowSpan > 1) maxLvl = Math.max(maxLvl, fc.level + fc.rowSpan - 1)
  return res
}

const maxLevel = (() => {
  let mx = 0
  const rec = (cols: GanttColumn[], depth: number) => {
    mx = Math.max(mx, depth)
    for (const c of cols) if (c.children?.length) rec(c.children, depth + 1)
  }
  rec(props.columns, 0)
  return mx
})()

const flatHeaderRows = computed(() => {
  if (!props.columns.some((c) => c.children?.length)) return null
  // 构建多行表头数据
  const rows: FlatCol[][] = []
  for (let i = 0; i <= maxLevel; i++) rows.push([])
  const flat = flattenColumns(props.columns)
  for (const fc of flat) {
    rows[fc.level].push(fc)
  }
  return rows
})

const hasNestedHeader = computed(() => flatHeaderRows.value !== null)

// ---------------- 列合并单元格 ----------------
/** 计算合并单元格的行跨度 */
function rowSpanFor(row: { task: GanttTask; index: number }, c: GanttColumn): number {
  if (!c.mergeCell) return 1
  const val = cellText(row, c.key)
  // 向下查找连续相同值的行
  let span = 1
  const rows = store.flatRows.value
  for (let i = row.index + 1; i < rows.length; i++) {
    if (cellText(rows[i], c.key) === val) span++
    else break
  }
  return span
}

/** 判断当前行是否应该跳过（被上面的合并单元格覆盖） */
function shouldSkipRow(row: { task: GanttTask; index: number }, c: GanttColumn): boolean {
  if (!c.mergeCell) return false
  const val = cellText(row, c.key)
  const rows = store.flatRows.value
  if (row.index === 0) return false
  return cellText(rows[row.index - 1], c.key) === val
}

// ---------------- 行内编辑（双击名称 / 进度单元格） ----------------
const editing = reactive({ id: null as string | null, key: '' as 'name' | 'progress', value: '' })

function startEdit(t: GanttTask, key: 'name' | 'progress') {
  if (props.readonly || !props.editable) return
  if (key === 'progress' && (t.milestone || rowOf(t)?.summary)) return
  editing.id = t.id
  editing.key = key
  editing.value = key === 'name' ? t.name : String(t.progress ?? 0)
}

function rowOf(t: GanttTask) {
  return store.flatRows.value.find((r) => r.task.id === t.id)
}

function focusEdit(el: unknown) {
  const input = el as HTMLInputElement | null
  input?.focus?.()
  input?.select?.()
}

function commitEdit() {
  const id = editing.id
  if (!id) return
  const key = editing.key
  const v = String(editing.value).trim()
  editing.id = null
  if (key === 'name') {
    if (v) store.editTask(id, { name: v })
  } else {
    const n = Number(v)
    if (v !== '' && !Number.isNaN(n)) store.editTask(id, { progress: Math.max(0, Math.min(100, Math.round(n))) })
  }
}

function cancelEdit() {
  editing.id = null
}

let ro: ResizeObserver | null = null
onMounted(() => {
  if (bodyRef.value) {
    viewH.value = bodyRef.value.clientHeight
    ro = new ResizeObserver(() => {
      viewH.value = bodyRef.value?.clientHeight ?? 320
    })
    ro.observe(bodyRef.value)
  }
  store.setContentEl(contentRef.value ?? null)
})
onBeforeUnmount(() => {
  ro?.disconnect()
  store.setContentEl(null)
})
watch(contentRef, (el) => store.setContentEl(el ?? null))

// ---------------- 虚拟滚动（行 + 列） ----------------
const viewStart = computed(() => Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - 8))
const viewEnd = computed(() =>
  Math.min(store.flatRows.value.length, Math.ceil((scrollTop.value + viewH.value) / props.rowHeight) + 8)
)
const viewRows = computed(() => store.flatRows.value.slice(viewStart.value, viewEnd.value))
const viewGeoms = computed(() => {
  const ids = new Set(viewRows.value.map((r) => r.task.id))
  return [...store.geoms.value.values()].filter((g) => ids.has(g.id))
})

// ---- 列虚拟化：时间刻度列超过 180 列时只渲染可见列 ----
const COL_VIRTUAL_THRESHOLD = 180
const colViewStart = computed(() => {
  const ticks = store.bottomTicks.value
  if (ticks.length <= COL_VIRTUAL_THRESHOLD) return 0
  const sl = scrollLeft.value
  // 找到第一个 left >= sl - 像素缓冲 的列
  const buffer = 200
  let lo = 0,
    hi = ticks.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ticks[mid].left + ticks[mid].width < sl - buffer) lo = mid + 1
    else hi = mid
  }
  return Math.max(0, lo - 2)
})
const colViewEnd = computed(() => {
  const ticks = store.bottomTicks.value
  if (ticks.length <= COL_VIRTUAL_THRESHOLD) return ticks.length
  const clip = timeClipRef.value
  const viewW = clip?.clientWidth ?? 800
  const sl = scrollLeft.value
  const buffer = 200
  const rightEdge = sl + viewW + buffer
  let lo = 0,
    hi = ticks.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ticks[mid].left > rightEdge) hi = mid - 1
    else lo = mid
  }
  return Math.min(ticks.length, lo + 3)
})
const viewTopTicks = computed(() => {
  const all = store.topTicks.value
  if (all.length <= 20) return all
  // topTicks 是聚合层，数量少，但也要按可见范围裁剪
  const sl = scrollLeft.value
  const clip = timeClipRef.value
  const viewW = clip?.clientWidth ?? 800
  return all.filter((t) => t.left + t.width >= sl - 100 && t.left <= sl + viewW + 100)
})
const viewBottomTicks = computed(() => {
  const all = store.bottomTicks.value
  if (all.length <= COL_VIRTUAL_THRESHOLD) return all
  return all.slice(colViewStart.value, colViewEnd.value)
})
const viewVLines = computed(() => {
  // 竖向网格线跟 bottomTicks 同步虚拟化
  return viewBottomTicks.value
})
const viewWeekendCols = computed(() => {
  const all = store.weekendCols.value
  if (all.length <= 20) return all
  const sl = scrollLeft.value
  const clip = timeClipRef.value
  const viewW = clip?.clientWidth ?? 800
  return all.filter((w) => w.left + w.width >= sl - 100 && w.left <= sl + viewW + 100)
})

// ---------------- 视口外任务定位指示器 ----------------
const offScreenTasks = computed(() => {
  if (!props.offScreenIndicator) return []
  const clip = timeClipRef.value
  if (!clip) return []
  const sl = scrollLeft.value
  const right = sl + clip.clientWidth
  const result: { id: string; name: string; side: 'left' | 'right' }[] = []
  for (const g of store.geoms.value.values()) {
    if (g.x + g.w < sl) {
      result.push({ id: g.id, name: g.task.name, side: 'left' })
    } else if (g.x > right) {
      result.push({ id: g.id, name: g.task.name, side: 'right' })
    }
  }
  return result.slice(0, 10) // 最多显示 10 个
})

function scrollToOffScreen(id: string) {
  scrollToTask(id, { animate: true })
}

// ---------------- 无限滚动填充 ----------------
/** 当时间线滚动到边缘时，扩展 chartStart/chartEnd */
const scrollEdge = reactive({ atLeft: true, atRight: false })
function checkScrollEdge() {
  const hs = hscrollRef.value
  if (!hs) return
  scrollEdge.atLeft = hs.scrollLeft <= 2
  scrollEdge.atRight = hs.scrollLeft + hs.clientWidth >= hs.scrollWidth - 2
}

// 监听滚动检查边缘
watch(scrollLeft, () => checkScrollEdge())

// ---------------- 可见范围事件（visible-range-change） ----------------
watch([scrollLeft, () => store.chartStart.value, () => store.chartEnd.value, () => store.pxPerDay.value], () => {
  const clip = timeClipRef.value
  if (!clip) return
  const sl = scrollLeft.value
  const left = store.xToTime(sl)
  const right = store.xToTime(sl + clip.clientWidth)
  emit('visible-range-change', { start: new Date(left), end: new Date(right) })
})

// ---------------- 资源面板 ----------------
const resourceRows = computed(() => {
  if (!props.showResourcePanel) return []
  const map = new Map<string, { name: string; allocation: number; color?: string; conflict: boolean }>()
  const walk = (tasks: GanttTask[]) => {
    for (const t of tasks) {
      const owner = typeof t.owner === 'string' ? t.owner : t.owner?.name
      if (owner) {
        const existing = map.get(owner)
        const alloc = t.progress ?? 0
        if (existing) {
          existing.allocation = Math.max(existing.allocation, alloc)
          // 同一人员分配超过 100% = 冲突
          if (existing.allocation > 100) existing.conflict = true
        } else {
          map.set(owner, {
            name: owner,
            allocation: alloc,
            color: typeof t.owner === 'object' ? t.owner.color : undefined,
            conflict: alloc > 100
          })
        }
      }
      if (t.children?.length) walk(t.children)
    }
  }
  walk(store.inner.value)
  return [...map.values()]
})

// ---------------- 导出方法 ----------------
function cellText(row: { task: GanttTask; summary?: boolean }, key: string): string {
  const t = row.task
  if (key === 'startDate' || key === 'endDate') {
    const v = t[key]
    return v ? fmt(toDate(v as any), props.dateFormat) : '—'
  }
  if (key === 'progress') {
    if (t.milestone && t.progress == null) return '—'
    const p = row.summary ? store.summaryProgress(t) : (t.progress ?? 0)
    const dec = props.progressDecimal
    return dec > 0 ? `${p.toFixed(dec)}%` : `${p}%`
  }
  if (key === 'owner') {
    const o = t.owner
    if (o == null) return ''
    return typeof o === 'string' ? o : o.name
  }
  const v = t[key]
  return v == null ? '' : String(v)
}

const rootStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.primaryColor) s['--gt-primary'] = props.primaryColor
  // headerStyle 映射到 CSS 变量
  const hs = props.headerStyle
  if (hs.bgColor) s['--gt-header-bg'] = hs.bgColor
  if (hs.textColor) s['--gt-header-text'] = hs.textColor
  // bodyStyle 映射到 CSS 变量
  const bs = props.bodyStyle
  if (bs.bgColor) s['--gt-bg'] = bs.bgColor
  if (bs.hoverColor) s['--gt-row-hover'] = bs.hoverColor
  if (bs.selectColor) s['--gt-row-selected'] = bs.selectColor
  if (bs.textColor) s['--gt-text'] = bs.textColor
  if (bs.todayColor) s['--gt-today'] = bs.todayColor
  if (bs.weekendColor) s['--gt-weekend'] = bs.weekendColor
  if (props.progressColor) s['--gt-progress-fill'] = props.progressColor
  return s
})

// ---------------- 任务详情侧边栏 ----------------
const detailTask = ref<GanttTask | null>(null)
const detailOpen = ref(false)

function onRowDblClick(t: GanttTask) {
  if (props.showTaskDetail) {
    detailTask.value = t
    detailOpen.value = true
  }
  if (props.rowDblClick) {
    emit('row-dbl-click', t)
  }
}

function closeDetail() {
  detailOpen.value = false
}

function saveDetail(field: keyof GanttTask, value: any) {
  if (!detailTask.value) return
  const t = detailTask.value
  if (field === 'name') {
    store.editTask(t.id, { name: String(value) })
  } else if (field === 'progress') {
    store.editTask(t.id, { progress: Number(value) })
  } else {
    // 直接修改字段并触发更新
    ;(t as any)[field] = value
    store.editTask(t.id, { name: t.name, progress: t.progress ?? 0 })
  }
  emit('update:data', store.inner.value)
  detailTask.value = { ...t }
}

// ---------------- highlightDate：悬停行高亮刻度格 ----------------
const highlightRowId = ref<string | null>(null)
const highlightLeft = computed(() => {
  if (!highlightRowId.value) return -1
  const g = store.geoms.value.get(highlightRowId.value)
  if (!g) return -1
  return g.x
})
const highlightWidth = computed(() => {
  if (!highlightRowId.value) return 0
  const g = store.geoms.value.get(highlightRowId.value)
  if (!g) return 0
  return g.w
})

function onRowEnter(t: GanttTask) {
  if (props.highlightDate) {
    highlightRowId.value = t.id
    store.hoverId.value = t.id
  }
}
function onRowLeave() {
  if (props.highlightDate) {
    highlightRowId.value = null
    store.hoverId.value = null
  }
}

// ---------------- 框选多选（boxSelect） ----------------
const boxSelectRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)
const boxSelectedIds = ref<Set<string>>(new Set())
let boxStart: { x: number; y: number } | null = null

function onContentPointerDown(e: PointerEvent) {
  if (!props.boxSelect || e.button !== 0) return
  // 只在点击空白区域时触发（非任务条）
  const target = e.target as HTMLElement
  if (target.closest('.gt-bar-wrap') || target.closest('.gt-link-hit') || target.closest('.gt-link-endpoint')) return
  const clip = timeClipRef.value
  if (!clip) return
  const rect = clip.getBoundingClientRect()
  boxStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  boxSelectRect.value = { x: boxStart.x, y: boxStart.y, w: 0, h: 0 }
  boxSelectedIds.value = new Set()

  const move = (ev: PointerEvent) => {
    if (!boxStart) return
    const r = clip.getBoundingClientRect()
    const cx = ev.clientX - r.left
    const cy = ev.clientY - r.top
    const x = Math.min(boxStart.x, cx)
    const y = Math.min(boxStart.y, cy)
    const w = Math.abs(cx - boxStart.x)
    const h = Math.abs(cy - boxStart.y)
    boxSelectRect.value = { x, y, w, h }
    // 计算选中任务（基于条形几何与选框的矩形相交）
    const sel = new Set<string>()
    const scrollL = clip.scrollLeft
    const offsetX = scrollL
    for (const [id, g] of store.geoms.value) {
      const gx = g.x + offsetX
      const gy = g.y
      if (gx < x + w && gx + g.w > x && gy < y + h && gy + g.h > y) {
        sel.add(id)
      }
    }
    boxSelectedIds.value = sel
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (boxSelectedIds.value.size > 0) {
      emit('selection-change', [...boxSelectedIds.value])
    }
    // 延迟清除选框
    setTimeout(() => {
      boxSelectRect.value = null
    }, 100)
    boxStart = null
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** 框选高亮任务条样式 */
function boxHighlightStyle(id: string) {
  const g = store.geoms.value.get(id)
  if (!g) return { display: 'none' }
  const clip = timeClipRef.value
  const scrollL = clip?.scrollLeft ?? 0
  return {
    left: g.x + scrollL + 'px',
    top: g.y + 'px',
    width: g.w + 'px',
    height: g.h + 'px',
  }
}

function onRowClick(t: GanttTask) {
  // 添加依赖模式：点击目标任务创建依赖线
  if (linkSourceId.value) {
    if (t.id !== linkSourceId.value) {
      const newLink = { from: linkSourceId.value, to: t.id, type: 'fs' as const }
      // 检查是否已存在相同依赖
      const exists = props.links.some((l) => l.from === newLink.from && l.to === newLink.to)
      if (!exists) {
        emit('update:links', [...props.links, newLink])
        emit('link-create', newLink)
      }
    }
    linkSourceId.value = null
    return
  }
  store.selectedId.value = t.id
  emit('row-click', t)
  // sliderIntoView：行点击时如果条形未完整可见则滚动到任务
  if (props.sliderIntoView) {
    const g = store.geoms.value.get(t.id)
    const hs = hscrollRef.value
    const clip = timeClipRef.value
    if (g && hs && clip) {
      const left = hs.scrollLeft
      const right = hs.scrollLeft + clip.clientWidth
      const barLeft = g.x
      const barRight = g.x + g.w
      const notVisible = barLeft < left || barRight > right
      if (notVisible) scrollToTask(t.id, { animate: true })
    }
  }
}
</script>

<template>
  <div
    class="gt-root"
    :class="{
      'gt-dark': dark,
      'gt-readonly': readonly,
      'gt-dragging': store.dragging.value,
      [`gt-theme-${theme}`]: true
    }"
    :style="rootStyle"
    role="grid"
    :aria-label="i18n.taskName + ' ' + (dark ? 'dark theme' : '')"
  >
    <!-- ============ 表头 ============ -->
    <div class="gt-header" :style="{ height: headerHeight + 'px' }">
      <div class="gt-table-header" :style="{ width: tableWidthLive + (showCheckbox ? 36 : 0) + 'px' }">
        <div v-if="showCheckbox" class="gt-th gt-checkbox-th">
          <input type="checkbox" :checked="allSelected" :indeterminate="someSelected" aria-label="Select all tasks" @change="toggleSelectAll" />
        </div>
        <!-- 多级嵌套表头 -->
        <template v-if="hasNestedHeader">
          <div class="gt-nested-header">
            <div v-for="(row, ri) in flatHeaderRows!" :key="'hr' + ri" class="gt-header-row">
              <div
                v-for="fc in row"
                :key="fc.col.key"
                class="gt-th"
                :style="{
                  width: (fc.colSpan === 1 ? colWidth(fc.col) : undefined) + 'px',
                  textAlign: fc.col.align || 'left',
                  gridRow: fc.rowSpan > 1 ? `span ${fc.rowSpan}` : undefined,
                  gridColumn: fc.colSpan > 1 ? `span ${fc.colSpan}` : undefined
                }"
              >
                {{ labelOf(fc.col) }}
                <span
                  v-if="resizableColumns && !fc.col.children?.length"
                  class="gt-col-resizer"
                  @pointerdown="onColResizeDown($event, fc.col)"
                />
              </div>
            </div>
          </div>
        </template>
        <!-- 单行表头 -->
        <template v-else>
          <template v-for="c in columns" :key="c.key">
            <div class="gt-th" role="columnheader" :style="{ width: colWidth(c) + 'px', textAlign: c.align || 'left' }">
              <slot :name="'header-' + c.key" :column="c">{{ labelOf(c) }}</slot>
              <span v-if="resizableColumns" class="gt-col-resizer" @pointerdown="onColResizeDown($event, c)" />
            </div>
          </template>
        </template>
      </div>
      <div class="gt-time-header">
        <div
          class="gt-time-header-inner"
          :style="{ width: contentWidth + 'px', transform: `translateX(${-scrollLeft}px)` }"
        >
          <div
            v-for="(t, i) in viewTopTicks"
            :key="'t' + i"
            class="gt-tick-top"
            :style="{ left: t.left + 'px', width: t.width + 'px' }"
          >
            <slot name="scale-top-label" :tick="t" :index="i">{{ t.label }}</slot>
          </div>
          <div
            v-for="(t, i) in viewBottomTicks"
            :key="'b' + i"
            class="gt-tick-bottom"
            :class="{ weekend: showWeekend && t.weekend }"
            :style="{ left: t.left + 'px', width: t.width + 'px' }"
          >
            <slot name="scale-bottom-label" :tick="t" :index="i">{{ t.label }}</slot>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 空数据提示 ============ -->
    <div v-if="emptyData && store.flatRows.value.length === 0" class="gt-empty-data" role="status" aria-live="polite">
      {{ emptyData }}
    </div>

    <!-- ============ 主体 ============ -->
          <div ref="bodyRef" class="gt-body" role="rowgroup" aria-label="Task list" @scroll="onBodyScroll">
      <div class="gt-body-inner" :style="{ height: store.rowsTotalHeight.value + 13 + 'px' }">
        <div class="gt-body-flex" :style="{ height: store.rowsTotalHeight.value + 'px' }">
          <!-- 左侧任务表 -->
          <div class="gt-table" :style="{ width: tableWidthLive + (showCheckbox ? 36 : 0) + 'px' }">
            <div
              v-for="row in viewRows"
              :key="row.task.id"
              class="gt-tr"
              :class="{
                selected: store.selectedId.value === row.task.id,
                summary: row.summary,
                'gt-drag-over': dragOverIndex === row.index,
                'gt-dragging-row': dragRowId === row.task.id,
                'gt-search-match': searchMatchIds.has(row.task.id)
              }"
              :style="{
                top: row.index * rowHeight + 'px',
                height: rowHeight + 'px',
                background: levelColor ? store.levelBgColor(row.depth) : undefined
              }"
              :tabindex="0"
              :aria-label="`${row.task.name}，进度 ${row.summary ? store.summaryProgress(row.task) : (row.task.progress ?? 0)}%`"
              role="row"
              @click="onRowClick(row.task)"
              @dblclick="onRowDblClick(row.task)"
              @mouseenter="onRowEnter(row.task)"
              @mouseleave="onRowLeave"
              @keydown="onKeydown"
              @dragstart="onRowDragStart($event, row.task)"
              @dragover="onRowDragOver($event, row.index)"
              @drop="onRowDrop($event, row.index)"
            >
              <div v-if="showCheckbox" class="gt-td gt-checkbox-td" @click.stop>
                <input type="checkbox" :checked="selectedIds.has(row.task.id)" :aria-label="`Select ${row.task.name}`" @change="toggleSelect(row.task.id)" />
              </div>
              <template v-for="c in columns" :key="c.key">
                <div
                  v-if="!shouldSkipRow(row, c)"
                  class="gt-td"
                  :style="{
                    width: colWidth(c) + 'px',
                    textAlign: c.align || 'left',
                    height: c.mergeCell ? rowSpanFor(row, c) * rowHeight + 'px' : undefined,
                    zIndex: c.mergeCell && rowSpanFor(row, c) > 1 ? 1 : undefined
                  }"
                >
                  <template v-if="editable && editing.id === row.task.id && editing.key === c.key">
                    <input
                      :ref="focusEdit"
                      v-model="editing.value"
                      class="gt-edit-input"
                      :class="{ num: c.key === 'progress' }"
                      :aria-label="`Edit ${c.key}`"
                      @keydown.enter.prevent="commitEdit"
                      @keydown.esc.prevent="cancelEdit"
                      @blur="commitEdit"
                      @click.stop
                    />
                  </template>
                  <template v-else>
                    <template v-if="c.key === 'name'">
                      <slot name="col-name" :task="row.task" :depth="row.depth" :summary="row.summary">
                        <span v-if="rowDraggable" class="gt-row-drag-handle" :draggable="true" />
                        <span
                          v-if="row.hasChildren"
                          class="gt-chevron"
                          :class="{ open: !store.isCollapsed(row.task.id) }"
                          @click.stop="store.toggleExpand(row.task)"
                        />
                        <span
                          class="gt-name"
                          :style="{ paddingLeft: row.depth * 16 + 'px' }"
                          :title="row.task.name"
                          @dblclick.stop="startEdit(row.task, 'name')"
                        >
                          <i v-if="row.task.milestone" class="gt-name-milestone" />
                          {{ row.task.name }}
                        </span>
                      </slot>
                    </template>
                    <slot v-else :name="'col-' + c.key" :task="row.task" :depth="row.depth" :summary="row.summary">
                      <span
                        class="gt-cell-text"
                        @dblclick.stop="c.key === 'progress' && startEdit(row.task, 'progress')"
                      >
                        {{ cellText(row, c.key) }}
                      </span>
                    </slot>
                  </template>
                </div>
              </template>
            </div>
          </div>

          <!-- 右侧时间线 -->
          <div
            ref="timeClipRef"
            class="gt-time-clip"
            role="rowgroup"
            aria-label="Timeline area"
            @wheel="onWheel"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @pointerdown="onContentPointerDown"
          >
            <div
              ref="contentRef"
              class="gt-time-content"
              :style="{
                width: contentWidth + 'px',
                transform: `translateX(${-scrollLeft}px)`,
                '--row-h': rowHeight + 'px'
              }"
            >
              <!-- 周末背景 -->
              <template v-if="showWeekend">
                <div
                  v-for="(w, i) in viewWeekendCols"
                  :key="'w' + i"
                  class="gt-weekend"
                  :style="{ left: w.left + 'px', width: w.width + 'px' }"
                />
              </template>
              <!-- 自定义假日背景 -->
              <div
                v-for="(h, i) in store.holidayCols.value"
                :key="'hol' + i"
                class="gt-holiday"
                :style="{ left: h.left + 'px', width: h.width + 'px', '--gt-holiday-color': h.color }"
              >
                {{ h.label }}
              </div>
              <!-- 分隔线（表格与时间线交界） -->
              <div v-if="showDivider" class="gt-divider" />
              <!-- 竖向网格线 -->
              <div v-for="(t, i) in viewVLines" :key="'v' + i" class="gt-vline" :style="{ left: t.left + 'px' }" />
              <!-- 今日线 -->
              <div
                v-if="showToday && store.todayX.value >= 0"
                class="gt-today"
                :style="{ left: store.todayX.value + 'px' }"
                role="presentation"
                aria-label="Today marker"
              />
              <!-- highlightDate 高亮区域 -->
              <div
                v-if="highlightLeft >= 0"
                class="gt-highlight-date"
                :style="{ left: highlightLeft + 'px', width: highlightWidth + 'px' }"
              />
              <!-- 依赖连线（在条形下层） -->
              <LinkLayer />
              <!-- 任务条 -->
              <TaskBar
                v-for="g in viewGeoms"
                :key="g.id"
                :geom="g"
                :show-slot="barSlot"
                :alignment="barAlignment"
                :progress-color="progressColor"
              >
                <template #bar-content="slotProps">
                  <slot name="bar-content" v-bind="slotProps" />
                </template>
              </TaskBar>
            </div>
              <!-- 框选多选矩形 -->
              <div
                v-if="boxSelectRect"
                class="gt-box-select-rect"
                :style="{ left: boxSelectRect.x + 'px', top: boxSelectRect.y + 'px', width: boxSelectRect.w + 'px', height: boxSelectRect.h + 'px' }"
              />
              <!-- 框选高亮任务条 -->
              <div
                v-for="id in boxSelectedIds"
                :key="'bs-' + id"
                class="gt-box-select-highlight"
                :style="boxHighlightStyle(id)"
              />
              <!-- 视口外任务定位指示器 -->
              <template v-if="offScreenTasks.length">
              <div
                v-for="(t, idx) in offScreenTasks.filter((t) => t.side === 'left')"
                :key="'off-l-' + t.id"
                class="gt-off-screen-indicator left"
                :style="{ transform: `translateY(calc(-50% + ${idx * 26}px))` }"
                @click="scrollToOffScreen(t.id)"
              >
                ← {{ t.name }}
              </div>
              <div
                v-for="(t, idx) in offScreenTasks.filter((t) => t.side === 'right')"
                :key="'off-r-' + t.id"
                class="gt-off-screen-indicator right"
                :style="{ transform: `translateY(calc(-50% + ${idx * 26}px))` }"
                @click="scrollToOffScreen(t.id)"
              >
                {{ t.name }} →
              </div>
            </template>
          </div>
        </div>

        <!-- 底部横向滚动条（sticky 固定可见） -->
        <div ref="hscrollRef" class="gt-hscroll" role="scrollbar" aria-orientation="horizontal" aria-label="Timeline horizontal scroll" @scroll="onHScroll">
          <div :style="{ width: contentWidth + 'px', height: '1px' }" />
        </div>
      </div>
    </div>

    <!-- ============ 资源面板 ============ -->
    <div v-if="showResourcePanel" class="gt-resource-panel" :style="{ maxHeight: '180px' }">
      <div v-for="row in resourceRows" :key="row.name" class="gt-resource-row">
        <span style="width: 80px; flex: none">{{ row.name }}</span>
        <div class="gt-resource-bar">
          <div
            class="gt-resource-bar-fill"
            :class="{ 'gt-resource-conflict': row.conflict }"
            :style="{ width: row.allocation + '%', background: row.color || undefined }"
          />
        </div>
        <span style="flex: none; width: 40px; text-align: right">{{ row.allocation }}%</span>
      </div>
    </div>

    <!-- ============ 悬浮提示 ============ -->
    <Teleport to="body">
      <div
        v-if="store.tooltip.visible && store.tooltip.task"
        class="gt-tooltip"
        :style="{ left: store.tooltip.x + 14 + 'px', top: store.tooltip.y + 16 + 'px' }"
      >
        <div class="gt-tooltip-name">
          <i v-if="store.tooltip.task.milestone" class="gt-name-milestone" />
          {{ store.tooltip.task.name }}
        </div>
        <div v-if="store.tooltip.task.startDate" class="gt-tooltip-row">
          开始：{{ fmt(toDate(store.tooltip.task.startDate as any)) }}
        </div>
        <div v-if="store.tooltip.task.baselineStart" class="gt-tooltip-row">
          计划：{{ fmt(toDate(store.tooltip.task.baselineStart as any)) }}
          <template v-if="store.tooltip.task.baselineEnd">
            ~ {{ fmt(toDate(store.tooltip.task.baselineEnd as any)) }}
          </template>
        </div>
        <div v-if="store.tooltip.task.endDate && !store.tooltip.task.milestone" class="gt-tooltip-row">
          结束：{{ fmt(toDate(store.tooltip.task.endDate as any)) }}
        </div>
        <div v-if="!store.tooltip.task.milestone" class="gt-tooltip-row">
          进度：{{ store.summaryProgress(store.tooltip.task) }}%
        </div>
      </div>
    </Teleport>

    <!-- ============ 右键菜单 ============ -->
    <Teleport v-if="ctxMenu.visible && props.contextMenu !== false" to="body">
      <div class="gt-ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
        <div
          v-for="item in ctxItems"
          :key="item.id"
          class="gt-ctx-item"
          :class="{ disabled: item.disabled }"
          @click="onCtxClick(item)"
        >
          {{ item.label }}
        </div>
      </div>
      <div class="gt-ctx-overlay" @click="closeCtxMenu" @contextmenu.prevent="closeCtxMenu" />
    </Teleport>

    <!-- 任务详情侧边栏 -->
    <Teleport to="body">
      <template v-if="detailOpen && detailTask">
        <div class="gt-detail-overlay" @click="closeDetail" />
        <div class="gt-detail-panel">
          <div class="gt-detail-header">
            <span class="gt-detail-title">任务详情</span>
            <button class="gt-detail-close" @click="closeDetail">✕</button>
          </div>
          <div class="gt-detail-body">
            <div class="gt-detail-field">
              <label>任务名称</label>
              <input
                :value="detailTask.name"
                @change="saveDetail('name', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="gt-detail-field">
              <label>开始日期</label>
              <input
                :value="detailTask.startDate ?? ''"
                @change="saveDetail('startDate', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="gt-detail-field">
              <label>结束日期</label>
              <input
                :value="detailTask.endDate ?? ''"
                @change="saveDetail('endDate', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="gt-detail-field">
              <label>进度</label>
              <input
                type="number"
                min="0"
                max="100"
                :value="detailTask.progress ?? 0"
                @change="saveDetail('progress', Number(($event.target as HTMLInputElement).value))"
              />
              <span class="gt-detail-suffix">%</span>
            </div>
            <div class="gt-detail-field">
              <label>负责人</label>
              <input
                :value="typeof detailTask.owner === 'string' ? detailTask.owner : detailTask.owner?.name ?? ''"
                @change="saveDetail('owner', ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="gt-detail-field">
              <label>里程碑</label>
              <input
                type="checkbox"
                :checked="!!detailTask.milestone"
                @change="saveDetail('milestone', ($event.target as HTMLInputElement).checked)"
              />
            </div>
            <div v-if="detailTask.children?.length" class="gt-detail-field">
              <label>子任务数</label>
              <span class="gt-detail-readonly">{{ detailTask.children.length }}</span>
            </div>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>
