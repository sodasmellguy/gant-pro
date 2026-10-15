/**
 * GanttChart — React 甘特图主组件
 *
 * DOM 结构与 Vue 版 GanttChart.vue 完全一致（.gt-header > .gt-table-header +
 * .gt-time-header / .gt-body > .gt-body-inner > .gt-body-flex > .gt-table +
 * .gt-time-clip），从而 1:1 复用 gantt.css（源自 Vue 版）的全部样式。
 *
 * 二批功能：列调宽 / 多级嵌套表头 / 合并单元格 / 键盘导航 / 条形插槽 / 资源面板
 */
import { memo, forwardRef, useImperativeHandle, useRef, useState, useMemo, useCallback, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { startOfDay } from '@gantt-pro/core'
import {
  GanttEngine, type EngineOptions, type GanttTask, type GanttLink, type GanttColumn,
  SCALE_ORDER, BUILTIN_LABELS, type ScaleType, type GanttLabels, fmt, toDate
} from '@gantt-pro/core'
import { useGanttStore } from './useGanttStore'
import { GanttContext } from './context'
import { TaskBar } from './TaskBar'
import { LinkLayer } from './LinkLayer'
import type { GanttChartProps, GanttRef, GanttChartCallbacks } from './types'

// 默认列配置
const DEFAULT_COLUMNS: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 200 },
  { key: 'startDate', label: '开始', width: 100 },
  { key: 'endDate', label: '结束', width: 100 },
  { key: 'progress', label: '进度', width: 70 },
]

const COL_VIRTUAL_THRESHOLD = 60
const ROW_VIRTUAL_THRESHOLD = 50

// ==================== 多级嵌套表头工具函数 ====================
interface FlatCol {
  col: GanttColumn
  level: number
  rowSpan: number
  colSpan: number
}

function computeMaxLevel(cols: GanttColumn[]): number {
  let mx = 0
  const rec = (cs: GanttColumn[], depth: number) => {
    mx = Math.max(mx, depth)
    for (const c of cs) if (c.children?.length) rec(c.children, depth + 1)
  }
  rec(cols, 0)
  return mx
}

function flattenColumns(cols: GanttColumn[], maxLevel: number): FlatCol[] {
  const res: FlatCol[] = []
  const walk = (c: GanttColumn, lvl: number): number => {
    if (!c.children?.length) {
      res.push({ col: c, level: lvl, rowSpan: maxLevel - lvl + 1, colSpan: 1 })
      return 1
    }
    let span = 0
    for (const child of c.children) span += walk(child, lvl + 1)
    res.unshift({ col: c, level: lvl, rowSpan: 1, colSpan: span })
    return span
  }
  for (const c of cols) walk(c, 0)
  return res
}

function buildHeaderRows(cols: GanttColumn[]): FlatCol[][] | null {
  if (!cols.some(c => c.children?.length)) return null
  const maxLevel = computeMaxLevel(cols)
  const rows: FlatCol[][] = []
  for (let i = 0; i <= maxLevel; i++) rows.push([])
  const flat = flattenColumns(cols, maxLevel)
  for (const fc of flat) {
    rows[fc.level].push(fc)
  }
  return rows
}

// ==================== 主组件 ====================
export const GanttChart = forwardRef<GanttRef, GanttChartProps>(function GanttChart(props, ref) {
  const {
    data, onDataChange, links = [], columns = DEFAULT_COLUMNS,
    scale = 'day', onScaleChange, onLinksChange,
    rowHeight = 36, barHeight = 24, headerHeight = 56,
    readonly = false, showBaseline = false, autoReschedule = false,
    filterOwner = null, showCriticalPath = false, hourWidth = 24,
    linkedResize = false, rowDraggable = false, fieldMap = {},
    holidays = [], levelColor = false, snap = false,
    showExpectedProgress = false, rangeStart = null, rangeEnd = null,
    moveByUnit = false, progressDecimal = 0, dark = false,
    primaryColor, locale = 'zh-CN', labels = {},
    allowLink = true, emptyData = '', dateFormat = 'MM-DD',
    progressColor = '', barAlignment = 'center', search = '',
    zoomOnWheel = true, showToday = true, showDivider = true,
    showWeekend = true, rowDblClick = false,
    showCheckbox = false, editable = false, contextMenu = false,
    resizableColumns = false,
    barSlot = false,
    boxSelect = false,
    showTaskDetail = false,
    snapToTask = 0,
    showResourcePanel = false,
    highlightDate = false,
    sliderIntoView = false,
    offScreenIndicator = true,
    theme = 'blue',
    // Callbacks
    onTaskChange, onLinkCreate, onLinkClick, onLinkDblClick, onLinkDelete,
    onLinkTypeChange, onLinkReconnect,
    onRowClick, onRowDblClick, onExpand, onReschedule,
    onRowMove, onVisibleRangeChange, onSelectionChange, onContextMenu,
    onUndo, onRedo,
    // Slots
    renderBarContent,
    renderCell,
    renderHeader,
    renderScaleTopLabel,
    renderScaleBottomLabel,
  } = props

  // 构建 i18n 标签
  const i18n = useMemo<GanttLabels>(() => ({
    ...BUILTIN_LABELS[locale],
    ...labels
  }), [locale, labels])

  // 构建 EngineOptions
  const engineOptions = useMemo<EngineOptions>(() => ({
    scale, rowHeight, barHeight, readonly, allowLink, showBaseline,
    autoReschedule, filterOwner, showCriticalPath, hourWidth,
    linkedResize, rowDraggable, fieldMap, holidays, levelColor,
    links, snap, showExpectedProgress, rangeStart, rangeEnd,
    moveByUnit, progressDecimal, labels: i18n, snapToTask
  }), [scale, rowHeight, barHeight, readonly, allowLink, showBaseline,
    autoReschedule, filterOwner, showCriticalPath, hourWidth,
    linkedResize, rowDraggable, fieldMap, holidays, levelColor,
    links, snap, showExpectedProgress, rangeStart, rangeEnd,
    moveByUnit, progressDecimal, i18n, snapToTask])

  // 回调对象
  const callbacks = useMemo<GanttChartCallbacks>(() => ({
    onTaskChange, onLinkCreate, onLinkClick, onLinkDblClick,
    onRowClick, onRowDblClick, onExpand, onReschedule,
    onUndo: onUndo, onRedo: onRedo, onRowMove: onRowMove,
    onSelectionChange: onSelectionChange, onContextMenu: onContextMenu,
    onLinkDelete: onLinkDelete, onLinkTypeChange, onLinkReconnect,
    onVisibleRangeChange: onVisibleRangeChange,
    onScaleChange: onScaleChange,
  }), [onTaskChange, onLinkCreate, onLinkClick, onLinkDblClick,
    onRowClick, onRowDblClick, onExpand, onReschedule,
    onUndo, onRedo, onRowMove, onSelectionChange, onContextMenu,
    onLinkDelete, onLinkTypeChange, onLinkReconnect,
    onVisibleRangeChange, onScaleChange])

  // 创建 engine
  const engine = useGanttStore(data, engineOptions, callbacks)

  // DOM refs
  const bodyRef = useRef<HTMLDivElement>(null)
  const hscrollRef = useRef<HTMLDivElement>(null)
  const timeClipRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 滚动状态
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewH, setViewH] = useState(600)

  // ---- 刻度切换保持位置（maintain_pos） ----
  const maintainPosTime = useRef<number | null>(null)
  const captureCenterTime = useCallback(() => {
    const hs = hscrollRef.current
    const clip = timeClipRef.current
    if (!hs || !clip) return
    const centerX = hs.scrollLeft + clip.clientWidth / 2
    maintainPosTime.current = engine.xToTime(centerX)
  }, [engine])
  const restoreCenterPos = useCallback(() => {
    if (maintainPosTime.current == null) return
    const hs = hscrollRef.current
    const clip = timeClipRef.current
    if (!hs || !clip) {
      maintainPosTime.current = null
      return
    }
    // 延迟到下一帧，等 engine 重新计算几何
    requestAnimationFrame(() => {
      const newX = engine.timeToX(maintainPosTime.current!)
      hs.scrollLeft = Math.max(0, Math.round(newX - clip.clientWidth / 2))
      setScrollLeft(hs.scrollLeft)
      maintainPosTime.current = null
    })
  }, [engine])

  // 当 scale 从外部变更时，保持位置（用 useLayoutEffect 确保在 paint 前捕获）
  const prevScale = useRef(scale)
  useLayoutEffect(() => {
    if (prevScale.current !== scale) {
      captureCenterTime()
      prevScale.current = scale
      // 等下一帧，等 engine 重新计算几何后再恢复位置
      requestAnimationFrame(() => {
        restoreCenterPos()
      })
    }
  }, [scale, captureCenterTime, restoreCenterPos])

  // 复选框多选
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const toggleChecked = useCallback((id: string) => {
    setCheckedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      onSelectionChange?.([...s])
      return s
    })
  }, [onSelectionChange])

  // 行内编辑
  const [editing, setEditing] = useState<{ id: string; key: 'name' | 'progress'; value: string } | null>(null)
  const startEdit = useCallback((t: GanttTask, key: 'name' | 'progress', summary: boolean) => {
    if (readonly || !editable) return
    if (key === 'progress' && (t.milestone || summary)) return
    setEditing({ id: t.id, key, value: key === 'name' ? t.name : String(t.progress ?? 0) })
  }, [readonly, editable])
  const commitEdit = useCallback(() => {
    if (!editing) return
    const { id, key, value } = editing
    setEditing(null)
    const v = value.trim()
    if (key === 'name') {
      if (v) engine.editTask(id, { name: v })
    } else {
      const n = Number(v)
      if (v !== '' && !Number.isNaN(n)) {
        engine.editTask(id, { progress: Math.max(0, Math.min(100, Math.round(n))) })
      }
    }
  }, [editing, engine])

  // 右键菜单
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; task: GanttTask } | null>(null)

  // 任务详情侧边栏
  const [detailTask, setDetailTask] = useState<GanttTask | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const saveDetail = useCallback((field: string, value: any) => {
    if (!detailTask) return
    if (field === 'name') {
      engine.editTask(detailTask.id, { name: String(value) })
    } else if (field === 'progress') {
      engine.editTask(detailTask.id, { progress: Number(value) })
    } else {
      ;(detailTask as any)[field] = value
      engine.editTask(detailTask.id, { name: detailTask.name, progress: detailTask.progress ?? 0 })
    }
    onDataChange?.(engine.data.peek())
    setDetailTask({ ...detailTask })
  }, [detailTask, engine, onDataChange])
  const linkSourceId = useRef<string | null>(null)
  const openContextMenu = useCallback((task: GanttTask, e: MouseEvent) => {
    if (contextMenu === false) return
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, task })
    if (typeof contextMenu === 'function') {
      contextMenu(task, e)
    } else {
      onContextMenu?.({ task, x: e.clientX, y: e.clientY })
    }
  }, [contextMenu, onContextMenu])
  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])
  const onCtxClick = useCallback((action: string) => {
    if (!ctxMenu) return
    const task = ctxMenu.task
    if (action === 'delete') {
      engine.deleteTask(task.id)
      onDataChange?.(engine.data.peek())
    } else if (action === 'add-link') {
      linkSourceId.current = task.id
      engine.selectedId.value = task.id
    } else if (action === 'copy-dates') {
      const text = `${task.startDate ?? ''} ~ ${task.endDate ?? ''}`
      if (navigator.clipboard) navigator.clipboard.writeText(text)
    }
    setCtxMenu(null)
  }, [ctxMenu, engine, onDataChange])

  // 行拖拽排序状态
  const dragRowId = useRef<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // ---- highlightDate：悬停行高亮刻度格 ----
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null)

  // 悬浮提示
  const [tooltip, setTooltip] = useState<{ x: number; y: number; task: GanttTask } | null>(null)
  const onContentMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const wrap = target.closest('.gt-bar-wrap') as HTMLElement | null
    if (wrap) {
      const id = wrap.dataset.taskId
      const g = id ? engine.geoms.get(id) : null
      if (g) {
        setTooltip(prev => (prev && prev.task.id === g.task.id ? { ...prev, x: e.clientX, y: e.clientY } : { x: e.clientX, y: e.clientY, task: g.task }))
        engine.hoverId.value = g.task.id
        if (highlightDate) setHighlightRowId(g.task.id)
        return
      }
    }
    setTooltip(prev => {
      if (prev) engine.hoverId.value = null
      return null
    })
    if (highlightDate) setHighlightRowId(null)
  }, [engine, highlightDate])

  // ---- 框选多选（boxSelect） ----
  const [boxSelectRect, setBoxSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [boxSelectedIds, setBoxSelectedIds] = useState<Set<string>>(new Set())
  const boxStartRef = useRef<{ x: number; y: number } | null>(null)

  const onBoxSelectDown = useCallback((e: React.PointerEvent) => {
    if (!boxSelect || e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('.gt-bar-wrap') || target.closest('.gt-link-hit') || target.closest('.gt-link-endpoint')) return
    const clip = timeClipRef.current
    if (!clip) return
    const rect = clip.getBoundingClientRect()
    boxStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setBoxSelectRect({ x: boxStartRef.current.x, y: boxStartRef.current.y, w: 0, h: 0 })
    setBoxSelectedIds(new Set())

    const move = (ev: PointerEvent) => {
      const start = boxStartRef.current
      if (!start) return
      const r = clip.getBoundingClientRect()
      const cx = ev.clientX - r.left
      const cy = ev.clientY - r.top
      const x = Math.min(start.x, cx)
      const y = Math.min(start.y, cy)
      const w = Math.abs(cx - start.x)
      const h = Math.abs(cy - start.y)
      setBoxSelectRect({ x, y, w, h })
      const sel = new Set<string>()
      const scrollL = clip.scrollLeft
      for (const [id, g] of engine.geoms) {
        const gx = g.x + scrollL
        const gy = g.y
        if (gx < x + w && gx + g.w > x && gy < y + h && gy + g.h > y) {
          sel.add(id)
        }
      }
      setBoxSelectedIds(sel)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setBoxSelectedIds((prev) => {
        if (prev.size > 0) onSelectionChange?.([...prev])
        return prev
      })
      setTimeout(() => setBoxSelectRect(null), 100)
      boxStartRef.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [boxSelect, engine, onSelectionChange])

  // ---- 列调宽 ----
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const colWidth = useCallback((c: GanttColumn): number => columnWidths[c.key] ?? c.width, [columnWidths])
  const onColResizeDown = useCallback((e: React.PointerEvent, c: GanttColumn) => {
    if (!resizableColumns) return
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidth(c)
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      setColumnWidths(prev => ({ ...prev, [c.key]: Math.max(40, startW + dx) }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [resizableColumns, colWidth])

  // 表头标签映射
  const labelOf = useCallback((c: GanttColumn): string => {
    const map: Record<string, keyof GanttLabels> = {
      name: 'taskName',
      startDate: 'startDate',
      endDate: 'endDate',
      owner: 'owner',
      progress: 'progress'
    }
    const key = map[c.key]
    return key ? i18n[key] : c.label
  }, [i18n])

  // ---- 多级嵌套表头 ----
  const flatHeaderRows = useMemo(() => buildHeaderRows(columns), [columns])
  const hasNestedHeader = flatHeaderRows !== null

  // ---- 合并单元格 ----
  const rowSpanFor = useCallback((row: { task: GanttTask; index: number; summary: boolean }, c: GanttColumn): number => {
    if (!c.mergeCell) return 1
    const val = cellText(row, c.key)
    let span = 1
    const rows = engine.flatRows
    for (let i = row.index + 1; i < rows.length; i++) {
      if (cellText({ task: rows[i].task, summary: rows[i].summary }, c.key) === val) span++
      else break
    }
    return span
  }, [engine])

  const shouldSkipRow = useCallback((row: { task: GanttTask; index: number; summary: boolean }, c: GanttColumn): boolean => {
    if (!c.mergeCell) return false
    const val = cellText(row, c.key)
    const rows = engine.flatRows
    if (row.index === 0) return false
    return cellText({ task: rows[row.index - 1].task, summary: rows[row.index - 1].summary }, c.key) === val
  }, [engine])

  // ---- 键盘导航 ----
  const onKeydown = useCallback((e: React.KeyboardEvent, task: GanttTask) => {
    const rows = engine.flatRows
    if (!rows.length) return
    const currentId = engine.selectedId.value
    const currentIdx = currentId ? rows.findIndex(r => r.task.id === currentId) : -1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIdx = currentIdx < 0 ? 0 : Math.min(rows.length - 1, currentIdx + 1)
      engine.selectedId.value = rows[nextIdx].task.id
      const body = bodyRef.current
      if (body) body.scrollTop = nextIdx * rowHeight - body.clientHeight / 2
      setScrollTop(body?.scrollTop ?? 0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIdx = currentIdx < 0 ? 0 : Math.max(0, currentIdx - 1)
      engine.selectedId.value = rows[prevIdx].task.id
      const body = bodyRef.current
      if (body) body.scrollTop = prevIdx * rowHeight - body.clientHeight / 2
      setScrollTop(body?.scrollTop ?? 0)
    } else if (e.key === 'Enter') {
      if (currentId) {
        const t = engine.findTask(currentId)
        if (t) onRowClick?.(t)
      }
    } else if (e.key === ' ' && currentId) {
      e.preventDefault()
      const t = engine.findTask(currentId)
      if (t?.children?.length) engine.toggleExpand(t)
    }
  }, [engine, rowHeight, onRowClick])

  // ---- 资源面板 ----
  const resourceRows = useMemo(() => {
    if (!showResourcePanel) return []
    const map = new Map<string, { name: string; allocation: number; color?: string; conflict: boolean }>()
    const walk = (tasks: GanttTask[]) => {
      for (const t of tasks) {
        const owner = typeof t.owner === 'string' ? t.owner : t.owner?.name
        if (owner) {
          const existing = map.get(owner)
          const alloc = t.progress ?? 0
          if (existing) {
            existing.allocation = Math.max(existing.allocation, alloc)
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
    walk(engine.data.value)
    return [...map.values()]
  }, [showResourcePanel, engine])

  // 虚拟滚动：可见行
  const flatRows = engine.flatRows
  const viewRows = useMemo(() => {
    const all = flatRows
    if (all.length <= ROW_VIRTUAL_THRESHOLD) return all
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 5)
    const end = Math.min(all.length, Math.ceil((scrollTop + viewH) / rowHeight) + 5)
    return all.slice(start, end)
  }, [flatRows, scrollTop, rowHeight, viewH])

  // 虚拟滚动：可见列（依赖 scale 确保刻度切换时重新计算）
  const viewBottomTicks = useMemo(() => {
    const all = engine.bottomTicks
    if (all.length <= COL_VIRTUAL_THRESHOLD) return all
    const clip = timeClipRef.current
    const viewW = clip?.clientWidth ?? 800
    const sl = scrollLeft
    let lo = 0, hi = all.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (all[mid].left + all[mid].width < sl) lo = mid + 1
      else hi = mid
    }
    const rightEdge = sl + viewW + 200
    let rEnd = lo
    while (rEnd < all.length && all[rEnd].left <= rightEdge) rEnd++
    return all.slice(Math.max(0, lo - 2), rEnd + 2)
  }, [engine, scrollLeft, scale])
  const viewTopTicks = useMemo(() => {
    const all = engine.topTicks
    if (all.length <= 20) return all
    const clip = timeClipRef.current
    const viewW = clip?.clientWidth ?? 800
    return all.filter(t => t.left + t.width >= scrollLeft - 100 && t.left <= scrollLeft + viewW + 100)
  }, [engine, scrollLeft, scale])
  const viewWeekendCols = useMemo(() => {
    const all = engine.weekendCols
    if (all.length <= 20) return all
    const clip = timeClipRef.current
    const viewW = clip?.clientWidth ?? 800
    return all.filter(w => w.left + w.width >= scrollLeft - 100 && w.left <= scrollLeft + viewW + 100)
  }, [engine, scrollLeft, scale])

  // 搜索高亮
  const searchMatchIds = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return new Set<string>()
    const result = new Set<string>()
    const walk = (tasks: GanttTask[]) => {
      for (const t of tasks) {
        if (t.name?.toLowerCase().includes(q)) result.add(t.id)
        if (t.children) walk(t.children)
      }
    }
    walk(engine.data.value)
    return result
  }, [search, engine])

  // 单元格文本
  const cellText = useCallback((row: { task: GanttTask; summary: boolean }, key: string): string => {
    const t = row.task
    if (key === 'startDate' || key === 'endDate') {
      const v = t[key]
      return v ? fmt(toDate(v as any), dateFormat) : '—'
    }
    if (key === 'progress') {
      if (t.milestone && t.progress == null) return '—'
      const p = row.summary ? engine.summaryProgress(t) : (t.progress ?? 0)
      return progressDecimal > 0 ? `${p.toFixed(progressDecimal)}%` : `${p}%`
    }
    if (key === 'owner') {
      const o = t.owner
      if (o == null) return ''
      return typeof o === 'string' ? o : o.name
    }
    const v = (t as any)[key]
    return v == null ? '' : String(v)
  }, [dateFormat, progressDecimal, engine])

  // 滚动处理
  const onBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  const onHScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft
    setScrollLeft(sl)
    if (onVisibleRangeChange) {
      const clip = timeClipRef.current
      if (clip) {
        const left = engine.xToTime(sl)
        const right = engine.xToTime(sl + clip.clientWidth)
        onVisibleRangeChange({ start: new Date(left), end: new Date(right) })
      }
    }
  }, [engine, onVisibleRangeChange])

  // 滚轮缩放（以鼠标位置为锚点，切换后保持位置）
  // 注意：React onWheel 是 passive 事件监听器，无法调用 preventDefault。
  // 改用原生 addEventListener + { passive: false } 来注册 wheel 事件。
  const wheelZoomState = useRef<{ mouseTime: number; viewX: number; next: ScaleType } | null>(null)
  const handleWheelZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey && zoomOnWheel) {
      e.preventDefault()
      const idx = SCALE_ORDER.indexOf(engineOptions.scale)
      const next = SCALE_ORDER[Math.max(0, Math.min(SCALE_ORDER.length - 1, idx + (e.deltaY > 0 ? 1 : -1)))]
      if (next !== engineOptions.scale && onScaleChange) {
        // 记录鼠标对应的时间戳
        const clip = timeClipRef.current
        const content = contentRef.current
        const hs = hscrollRef.current
        if (clip && content && hs) {
          const contentRect = content.getBoundingClientRect()
          const mouseX = e.clientX - contentRect.left + hs.scrollLeft
          const mouseTime = engine.xToTime(mouseX)
          const viewX = e.clientX - clip.getBoundingClientRect().left
          onScaleChange(next)
          // 等下一帧恢复位置
          wheelZoomState.current = { mouseTime, viewX, next }
          requestAnimationFrame(() => {
            const newX = engine.timeToX(mouseTime)
            hs.scrollLeft = Math.max(0, Math.round(newX - viewX))
            setScrollLeft(hs.scrollLeft)
          })
        } else {
          onScaleChange(next)
        }
      }
      return
    }
    const hs = hscrollRef.current
    if (!hs) return
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0)
    if (dx) {
      e.preventDefault()
      hs.scrollLeft += dx
    }
  }, [engineOptions.scale, onScaleChange, zoomOnWheel, engine])

  // 注册原生 wheel 事件监听器（passive: false，避免 preventDefault 报错）
  useEffect(() => {
    const el = timeClipRef.current
    if (!el) return
    const opts: AddEventListenerOptions = { passive: false }
    el.addEventListener('wheel', handleWheelZoom, opts)
    return () => el.removeEventListener('wheel', handleWheelZoom)
  }, [handleWheelZoom])

  // 行点击
  const handleRowClick = useCallback((task: GanttTask) => {
    if (linkSourceId.current) {
      if (task.id !== linkSourceId.current) {
        const newLink: GanttLink = { from: linkSourceId.current, to: task.id, type: 'fs' }
        const exists = (links ?? []).some(l => l.from === newLink.from && l.to === newLink.to)
        if (!exists) {
          if (onLinksChange) onLinksChange([...links, newLink])
          else engine.updateOptions({ links: [...(engineOptions.links ?? []), newLink] })
          onLinkCreate?.(newLink)
        }
      }
      linkSourceId.current = null
      return
    }
    engine.selectedId.value = task.id
    onRowClick?.(task)
    // sliderIntoView：行点击时如果条形未完整可见则滚动到任务
    if (sliderIntoView) {
      const g = engine.geoms.get(task.id)
      const hs = hscrollRef.current
      const clip = timeClipRef.current
      if (g && hs && clip) {
        const left = hs.scrollLeft
        const right = hs.scrollLeft + clip.clientWidth
        const barLeft = g.x
        const barRight = g.x + g.w
        const notVisible = barLeft < left || barRight > right
        if (notVisible) {
          const targetLeft = Math.max(0, g.x + g.w / 2 - clip.clientWidth / 2)
          hs.scrollLeft = targetLeft
          setScrollLeft(hs.scrollLeft)
        }
      }
    }
  }, [engine, engineOptions.links, links, onLinkCreate, onLinksChange, onRowClick, sliderIntoView])

  // 行拖拽排序
  const onRowDragStart = useCallback((e: React.DragEvent, task: GanttTask) => {
    if (!rowDraggable || readonly) return
    dragRowId.current = task.id
    e.dataTransfer?.setData('text/plain', task.id)
  }, [rowDraggable, readonly])
  const onRowDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!rowDraggable || !dragRowId.current) return
    e.preventDefault()
    setDragOverIndex(index)
  }, [rowDraggable])
  const onRowDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    const id = dragRowId.current
    dragRowId.current = null
    setDragOverIndex(null)
    if (!id) return
    const t = engine.findTask(id)
    if (!t) return
    const result = engine.moveRow(id, index)
    if (result) {
      onRowMove?.({ task: t, ...result })
      onDataChange?.(engine.data.peek())
    }
  }, [engine, onRowMove, onDataChange])

  // 连线双击删除
  const handleLinkDelete = useCallback((link: GanttLink) => {
    const newLinks = (links ?? []).filter(l =>
      !(l.from === link.from && l.to === link.to && (l.type ?? 'fs') === (link.type ?? 'fs'))
    )
    if (onLinksChange) onLinksChange(newLinks)
    else engine.updateOptions({ links: newLinks })
    onLinkDelete?.(link)
  }, [links, onLinksChange, onLinkDelete, engine])

  // 连线修改类型
  const handleLinkTypeChange = useCallback((link: GanttLink, type: any) => {
    const newLinks = (links ?? []).map(l =>
      l.from === link.from && l.to === link.to && (l.type ?? 'fs') === (link.type ?? 'fs')
        ? { ...l, type }
        : l
    )
    if (onLinksChange) onLinksChange(newLinks)
    else engine.updateOptions({ links: newLinks })
  }, [links, onLinksChange, engine])

  // 连线重连端点
  const handleLinkReconnect = useCallback((link: GanttLink, side: 'from' | 'to', newTaskId: string) => {
    const newLinks = (links ?? []).map(l =>
      l.from === link.from && l.to === link.to && (l.type ?? 'fs') === (link.type ?? 'fs')
        ? { ...l, [side]: newTaskId }
        : l
    ) as GanttLink[]
    if (onLinksChange) onLinksChange(newLinks)
    else engine.updateOptions({ links: newLinks })
  }, [links, onLinksChange, engine])

  // 双指捏合缩放（以双指中心为锚点，切换后保持位置）
  const pinchPrevDist = useRef<number | null>(null)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchPrevDist.current = Math.hypot(dx, dy)
    }
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchPrevDist.current != null && zoomOnWheel) {
      e.preventDefault()
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      const ratio = dist / pinchPrevDist.current
      if (Math.abs(ratio - 1) > 0.06) {
        const idx = SCALE_ORDER.indexOf(engineOptions.scale)
        const direction = ratio > 1 ? -1 : 1
        const next = SCALE_ORDER[Math.max(0, Math.min(SCALE_ORDER.length - 1, idx + direction))]
        if (next !== engineOptions.scale && onScaleChange) {
          const clip = timeClipRef.current
          const content = contentRef.current
          const hs = hscrollRef.current
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
          if (clip && content && hs) {
            const viewX = cx - clip.getBoundingClientRect().left
            const mouseTime = engine.xToTime(cx - content.getBoundingClientRect().left + hs.scrollLeft)
            onScaleChange(next)
            requestAnimationFrame(() => {
              const newX = engine.timeToX(mouseTime)
              hs.scrollLeft = Math.max(0, Math.round(newX - viewX))
              setScrollLeft(hs.scrollLeft)
            })
          } else {
            onScaleChange(next)
          }
        }
      }
      pinchPrevDist.current = dist
    }
  }, [engineOptions.scale, onScaleChange, zoomOnWheel, engine])

  // ResizeObserver
  useEffect(() => {
    if (!bodyRef.current) return
    const ro = new ResizeObserver(() => {
      if (bodyRef.current) setViewH(bodyRef.current.clientHeight)
    })
    ro.observe(bodyRef.current)
    setViewH(bodyRef.current.clientHeight)
    return () => ro.disconnect()
  }, [])

  // 设置 contentEl 给 engine
  useEffect(() => {
    engine.setContentEl(contentRef.current)
  }, [engine])

  // 复选框表头全选状态
  const allSelected = flatRows.length > 0 && flatRows.every(r => checkedIds.has(r.task.id))
  const someSelected = flatRows.some(r => checkedIds.has(r.task.id)) && !allSelected
  const toggleSelectAll = useCallback(() => {
    const next = new Set<string>()
    if (!allSelected) flatRows.forEach(r => next.add(r.task.id))
    setCheckedIds(next)
    onSelectionChange?.([...next])
  }, [allSelected, flatRows, onSelectionChange])

  // 暴露 ref 方法
  useImperativeHandle(ref, () => ({
    undo: () => engine.undo(),
    redo: () => engine.redo(),
    scrollToToday: () => {
      const tx = engine.todayX
      const hs = hscrollRef.current
      const clip = timeClipRef.current
      if (tx < 0 || !hs || !clip) return
      hs.scrollLeft = Math.max(0, tx - clip.clientWidth / 2)
      setScrollLeft(hs.scrollLeft)
    },
    scrollToTask: (id) => {
      const g = engine.geoms.get(id)
      const hs = hscrollRef.current
      const clip = timeClipRef.current
      const body = bodyRef.current
      if (!g || !hs || !clip || !body) return
      hs.scrollLeft = Math.max(0, g.x + g.w / 2 - clip.clientWidth / 2)
      body.scrollTop = Math.max(0, g.y - body.clientHeight / 2)
      setScrollLeft(hs.scrollLeft)
      setScrollTop(body.scrollTop)
    },
    jumpToDate: (date) => {
      const hs = hscrollRef.current
      const clip = timeClipRef.current
      if (!hs || !clip) return
      const d = date ? new Date(date) : startOfDay(new Date())
      const tx = engine.timeToX(d.getTime())
      const target = Math.max(0, tx - clip.clientWidth / 2)
      hs.scrollLeft = target
      setScrollLeft(hs.scrollLeft)
    },
    print: () => {
      engine.expandAll(true)
      setTimeout(() => window.print(), 100)
    },
    exportData: async (options) => {
      const { exportGantt } = await import('@gantt-pro/core')
      return exportGantt(engine.data.value, contentRef.current, options)
    },
    getSelected: () => new Set(checkedIds),
    selectAll: (v) => {
      const next = new Set<string>()
      if (v) engine.flatRows.forEach(r => next.add(r.task.id))
      setCheckedIds(next)
      onSelectionChange?.([...next])
    }
  }), [engine, checkedIds, onSelectionChange])

  // Root style（映射 headerStyle/bodyStyle 到 CSS 变量）
  const rootStyle = useMemo(() => {
    const s: Record<string, string> = {}
    if (primaryColor) s['--gt-primary'] = primaryColor
    const hs = props.headerStyle
    if (hs?.bgColor) s['--gt-header-bg'] = hs.bgColor
    if (hs?.textColor) s['--gt-header-text'] = hs.textColor
    const bs = props.bodyStyle
    if (bs?.bgColor) s['--gt-bg'] = bs.bgColor
    if (bs?.hoverColor) s['--gt-row-hover'] = bs.hoverColor
    if (bs?.selectColor) s['--gt-row-selected'] = bs.selectColor
    if (bs?.textColor) s['--gt-text'] = bs.textColor
    if (bs?.todayColor) s['--gt-today'] = bs.todayColor
    if (bs?.weekendColor) s['--gt-weekend'] = bs.weekendColor
    if (progressColor) s['--gt-progress-fill'] = progressColor
    return s
  }, [primaryColor, props.headerStyle, props.bodyStyle, progressColor])

  // 从 engine 读取计算值
  const geoms = engine.geoms
  const contentWidth = engine.contentWidth
  const todayX = engine.todayX
  const rowsTotalHeight = engine.rowsTotalHeight
  const dragging = engine.dragging

  // 可见条形
  const viewGeoms = useMemo(() => {
    const result = []
    for (const row of viewRows) {
      const g = geoms.get(row.task.id)
      if (g) result.push(g)
    }
    return result
  }, [viewRows, geoms])

  // 视口外任务定位指示器
  const offScreenTasks = useMemo(() => {
    if (!offScreenIndicator) return []
    const clip = timeClipRef.current
    if (!clip) return []
    const sl = scrollLeft
    const right = sl + clip.clientWidth
    const result: { id: string; name: string; side: 'left' | 'right' }[] = []
    for (const g of geoms.values()) {
      if (g.x + g.w < sl) {
        result.push({ id: g.id, name: g.task.name, side: 'left' })
      } else if (g.x > right) {
        result.push({ id: g.id, name: g.task.name, side: 'right' })
      }
    }
    return result.slice(0, 10)
  }, [offScreenIndicator, scrollLeft, geoms])

  const scrollToOffScreen = useCallback((id: string) => {
    const g = engine.geoms.get(id)
    const hs = hscrollRef.current
    const clip = timeClipRef.current
    const body = bodyRef.current
    if (!g || !hs || !clip || !body) return
    hs.scrollLeft = Math.max(0, g.x + g.w / 2 - clip.clientWidth / 2)
    body.scrollTop = Math.max(0, g.y - body.clientHeight / 2)
    setScrollLeft(hs.scrollLeft)
    setScrollTop(body.scrollTop)
  }, [engine])

  const tableWidthLive = columns.reduce((s, c) => s + colWidth(c), 0)

  return (
    <GanttContext.Provider value={engine}>
      <div
        className={`gt-root ${dark ? 'gt-dark' : ''} ${readonly ? 'gt-readonly' : ''} ${dragging ? 'gt-dragging' : ''} gt-theme-${theme}`}
        style={rootStyle}
        role="grid"
        aria-label={i18n.taskName}
        onClick={closeCtxMenu}
      >
        {/* ============ 表头 ============ */}
        <div className="gt-header" style={{ height: headerHeight }}>
          <div className="gt-table-header" style={{ width: tableWidthLive + (showCheckbox ? 36 : 0) }}>
            {showCheckbox && (
              <div className="gt-th gt-checkbox-th">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) (el as any).indeterminate = someSelected }}
                  onChange={toggleSelectAll}
                />
              </div>
            )}
            {/* 多级嵌套表头 */}
            {hasNestedHeader ? (
              <div className="gt-nested-header">
                {flatHeaderRows!.map((row, ri) => (
                  <div key={'hr' + ri} className="gt-header-row">
                    {row.map((fc) => (
                      <div
                        key={fc.col.key}
                        className="gt-th"
                        style={{
                          width: fc.col.children?.length ? undefined : colWidth(fc.col),
                          textAlign: fc.col.align || 'left',
                          gridRow: fc.rowSpan > 1 ? `span ${fc.rowSpan}` : undefined,
                          gridColumn: fc.colSpan > 1 ? `span ${fc.colSpan}` : undefined,
                        }}
                      >
                        {renderHeader ? renderHeader(fc.col) : labelOf(fc.col)}
                        {resizableColumns && !fc.col.children?.length && (
                          <span
                            className="gt-col-resizer"
                            onPointerDown={(e) => onColResizeDown(e, fc.col)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              /* 单行表头 */
              columns.map((col, i) => (
                <div
                  key={i}
                  className="gt-th"
                  style={{ width: colWidth(col), textAlign: col.align || 'left' }}
                >
                  {renderHeader ? renderHeader(col) : labelOf(col)}
                  {resizableColumns && (
                    <span
                      className="gt-col-resizer"
                      onPointerDown={(e) => onColResizeDown(e, col)}
                    />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="gt-time-header">
            <div
              className="gt-time-header-inner"
              style={{ width: contentWidth, transform: `translateX(${-scrollLeft}px)` }}
            >
              {viewTopTicks.map((tick, i) => (
                <div
                  key={'t' + i}
                  className="gt-tick-top"
                  style={{ left: tick.left, width: tick.width }}
                >{renderScaleTopLabel ? renderScaleTopLabel(tick) : tick.label}</div>
              ))}
              {viewBottomTicks.map((tick, i) => (
                <div
                  key={'b' + i}
                  className={`gt-tick-bottom ${showWeekend && tick.weekend ? 'weekend' : ''}`}
                  style={{ left: tick.left, width: tick.width }}
                >{renderScaleBottomLabel ? renderScaleBottomLabel(tick) : tick.label}</div>
              ))}
            </div>
          </div>
        </div>

        {/* ============ 空数据提示 ============ */}
        {emptyData && flatRows.length === 0 && (
          <div className="gt-empty-data" role="status" aria-live="polite">{emptyData}</div>
        )}

        {/* ============ 主体 ============ */}
        {flatRows.length > 0 && (
          <div className="gt-body" ref={bodyRef} role="rowgroup" aria-label="Task list" onScroll={onBodyScroll}>
            <div className="gt-body-inner" style={{ height: rowsTotalHeight + 13 }}>
              <div className="gt-body-flex" style={{ height: rowsTotalHeight }}>
                {/* 左侧任务表 */}
                <div className="gt-table" style={{ width: tableWidthLive + (showCheckbox ? 36 : 0) }}>
                  {viewRows.map((row) => {
                    const t = row.task
                    const isEditing = editing?.id === t.id
                    return (
                      <div
                        key={t.id}
                        className={`gt-tr ${engine.selectedId.value === t.id ? 'selected' : ''} ${row.summary ? 'summary' : ''} ${searchMatchIds.has(t.id) ? 'gt-search-match' : ''} ${dragOverIndex === row.index ? 'gt-drag-over' : ''}`}
                        style={{
                          top: row.index * rowHeight,
                          height: rowHeight,
                          background: levelColor ? engine.levelBgColor(row.depth) : undefined
                        }}
                        onClick={() => handleRowClick(t)}
                        onDoubleClick={() => {
                          if (showTaskDetail) { setDetailTask(t); setDetailOpen(true) }
                          if (rowDblClick) onRowDblClick?.(t)
                        }}
                        draggable={rowDraggable || undefined}
                        onDragStart={(e) => onRowDragStart(e, t)}
                        onDragOver={(e) => onRowDragOver(e, row.index)}
                        onDrop={(e) => onRowDrop(e, row.index)}
                        tabIndex={0}
                        role="row"
                        aria-label={`${t.name}，进度 ${row.summary ? engine.summaryProgress(t) : (t.progress ?? 0)}%`}
                        onKeyDown={(e) => onKeydown(e, t)}
                      >
                        {/* 复选框 */}
                        {showCheckbox && (
                          <div className="gt-td gt-checkbox-td" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checkedIds.has(t.id)}
                              aria-label={`Select ${t.name}`}
                              onChange={() => toggleChecked(t.id)}
                            />
                          </div>
                        )}
                        {columns.map((col, i) => {
                          const key = col.key as string
                          // 合并单元格：被上面的合并覆盖时跳过
                          if (shouldSkipRow(row, col)) return null
                          const span = rowSpanFor(row, col)
                          // 行内编辑态
                          if (isEditing && editing!.key === key) {
                            return (
                              <div key={i} className="gt-td" style={{ width: colWidth(col), textAlign: col.align || 'left' }}>
                                <input
                                  className={`gt-edit-input ${key === 'progress' ? 'num' : ''}`}
                                  autoFocus
                                  aria-label={`Edit ${key}`}
                                  value={editing!.value}
                                  onChange={e => setEditing({ ...editing!, value: e.target.value })}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') commitEdit()
                                    else if (e.key === 'Escape') setEditing(null)
                                  }}
                                  onBlur={commitEdit}
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )
                          }
                          return (
                            <div
                              key={i}
                              className="gt-td"
                              style={{
                                width: colWidth(col),
                                textAlign: col.align || 'left',
                                height: col.mergeCell && span > 1 ? span * rowHeight : undefined,
                                zIndex: col.mergeCell && span > 1 ? 1 : undefined
                              }}
                            >
                              {key === 'name' ? (
                                <>
                                  {rowDraggable && (
                                    <span className="gt-row-drag-handle" draggable onDragStart={(e) => onRowDragStart(e, t)} />
                                  )}
                                  {row.hasChildren && (
                                    <span
                                      className={`gt-chevron ${engine.isCollapsed(t.id) ? '' : 'open'}`}
                                      onClick={(e) => { e.stopPropagation(); engine.toggleExpand(t) }}
                                    />
                                  )}
                                  <span
                                    className="gt-name"
                                    style={{ paddingLeft: row.depth * 16 }}
                                    title={t.name}
                                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(t, 'name', row.summary) }}
                                  >
                                    {t.milestone && <i className="gt-name-milestone" />}{t.name}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className="gt-cell-text"
                                  onDoubleClick={(e) => {
                                    if (key === 'progress') { e.stopPropagation(); startEdit(t, 'progress', row.summary) }
                                  }}
                                >{renderCell ? renderCell(t, key, cellText(row, key)) : cellText(row, key)}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* 右侧时间线 */}
                <div
                  className="gt-time-clip"
                  ref={timeClipRef}
                  role="rowgroup"
                  aria-label="Timeline area"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onMouseMove={onContentMouseMove}
                  onMouseLeave={() => { setTooltip(null); engine.hoverId.value = null; if (highlightDate) setHighlightRowId(null) }}
                  onPointerDown={onBoxSelectDown}
                >
                  <div
                    className="gt-time-content"
                    ref={contentRef}
                    style={{
                      width: contentWidth,
                      transform: `translateX(${-scrollLeft}px)`,
                      '--row-h': rowHeight + 'px'
                    } as React.CSSProperties}
                  >
                    {/* 周末背景 */}
                    {showWeekend && viewWeekendCols.map((w, i) => (
                      <div key={'w' + i} className="gt-weekend" style={{ left: w.left, width: w.width }} />
                    ))}
                    {/* 自定义假日背景 */}
                    {engine.holidayCols.map((h, i) => (
                      <div
                        key={'hol' + i}
                        className="gt-holiday"
                        style={{ left: h.left, width: h.width, '--gt-holiday-color': h.color } as React.CSSProperties}
                      >{h.label}</div>
                    ))}
                    {/* 分隔线 */}
                    {showDivider && <div className="gt-divider" />}
                    {/* 竖向网格线 */}
                    {viewBottomTicks.map((t, i) => (
                      <div key={'v' + i} className="gt-vline" style={{ left: t.left }} />
                    ))}
                    {/* 今日线 */}
                    {showToday && todayX >= 0 && (
                      <div className="gt-today" style={{ left: todayX }} role="presentation" aria-label="Today marker" />
                    )}
                    {/* highlightDate 高亮区域 */}
                    {highlightDate && highlightRowId && (() => {
                      const g = engine.geoms.get(highlightRowId)
                      if (!g) return null
                      return <div className="gt-highlight-date" style={{ left: g.x, width: g.w }} />
                    })()}
                    {/* 依赖连线 */}
                    <LinkLayer
                      onLinkDelete={handleLinkDelete}
                      onLinkTypeChange={handleLinkTypeChange}
                      onLinkReconnect={handleLinkReconnect}
                      scale={scale}
                    />
                    {/* 任务条 */}
                    {viewGeoms.map((g) => (
                      <TaskBar
                        key={g.id}
                        geom={g}
                        alignment={barAlignment}
                        progressColor={progressColor}
                        showSlot={barSlot}
                        onTaskContextMenu={openContextMenu}
                      >
                        {barSlot && renderBarContent ? renderBarContent(g.task, g, g.task.progress ?? 0) : undefined}
                      </TaskBar>
                    ))}
                  </div>
                  {/* 框选多选矩形 */}
                  {boxSelectRect && (
                    <div
                      className="gt-box-select-rect"
                      style={{ left: boxSelectRect.x, top: boxSelectRect.y, width: boxSelectRect.w, height: boxSelectRect.h }}
                    />
                  )}
                  {/* 框选高亮任务条 */}
                  {[...boxSelectedIds].map((id) => {
                    const g = engine.geoms.get(id)
                    if (!g) return null
                    const sl = timeClipRef.current?.scrollLeft ?? 0
                    return (
                      <div
                        key={'bs-' + id}
                        className="gt-box-select-highlight"
                        style={{ left: g.x + sl, top: g.y, width: g.w, height: g.h }}
                      />
                    )
                  })}
                  {/* 视口外任务定位指示器 */}
                  {offScreenTasks.length > 0 && (
                    <>
                      {offScreenTasks.filter(t => t.side === 'left').map((t, idx) => (
                        <div
                          key={'off-l-' + t.id}
                          className="gt-off-screen-indicator left"
                          style={{ transform: `translateY(calc(-50% + ${idx * 26}px))` }}
                          onClick={() => scrollToOffScreen(t.id)}
                        >
                          ← {t.name}
                        </div>
                      ))}
                      {offScreenTasks.filter(t => t.side === 'right').map((t, idx) => (
                        <div
                          key={'off-r-' + t.id}
                          className="gt-off-screen-indicator right"
                          style={{ transform: `translateY(calc(-50% + ${idx * 26}px))` }}
                          onClick={() => scrollToOffScreen(t.id)}
                        >
                          {t.name} →
                        </div>
                      ))}
                    </>
                  )}
                </div>

              </div>

              {/* 底部横向滚动条（在 flex 之外，避免挤压时间线） */}
              <div className="gt-hscroll" ref={hscrollRef} role="scrollbar" aria-orientation="horizontal" aria-label="Timeline horizontal scroll" onScroll={onHScroll}>
                <div style={{ width: contentWidth, height: 1 }} />
              </div>
            </div>
          </div>
        )}

        {/* ============ 资源面板 ============ */}
        {showResourcePanel && resourceRows.length > 0 && (
          <div className="gt-resource-panel" style={{ maxHeight: '180px' }}>
            {resourceRows.map((row) => (
              <div key={row.name} className="gt-resource-row">
                <span style={{ width: 80, flex: 'none' }}>{row.name}</span>
                <div className="gt-resource-bar">
                  <div
                    className={`gt-resource-bar-fill ${row.conflict ? 'gt-resource-conflict' : ''}`}
                    style={{ width: row.allocation + '%', background: row.color || undefined }}
                  />
                </div>
                <span style={{ flex: 'none', width: 40, textAlign: 'right' }}>{row.allocation}%</span>
              </div>
            ))}
          </div>
        )}

        {/* ============ 悬浮提示 ============ */}
        {tooltip && (
          <div className="gt-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 16 }}>
            <div className="gt-tooltip-name">
              {tooltip.task.milestone && <i className="gt-name-milestone" />}{tooltip.task.name}
            </div>
            {tooltip.task.startDate && (
              <div className="gt-tooltip-row">开始：{fmt(toDate(tooltip.task.startDate as any))}</div>
            )}
            {tooltip.task.baselineStart && (
              <div className="gt-tooltip-row">
                计划：{fmt(toDate(tooltip.task.baselineStart as any))}
                {tooltip.task.baselineEnd && <> ~ {fmt(toDate(tooltip.task.baselineEnd as any))}</>}
              </div>
            )}
            {tooltip.task.endDate && !tooltip.task.milestone && (
              <div className="gt-tooltip-row">结束：{fmt(toDate(tooltip.task.endDate as any))}</div>
            )}
            {!tooltip.task.milestone && (
              <div className="gt-tooltip-row">进度：{engine.summaryProgress(tooltip.task)}%</div>
            )}
          </div>
        )}

        {/* ============ 右键菜单 ============ */}
        {ctxMenu && contextMenu !== false && (
          <CtxMenuPortal
            menu={ctxMenu}
            i18n={i18n}
            onAction={onCtxClick}
            onClose={closeCtxMenu}
          />
        )}

        {/* ============ 任务详情侧边栏 ============ */}
        {detailOpen && detailTask && (
          <>
            <div className="gt-detail-overlay" onClick={() => setDetailOpen(false)} />
            <div className="gt-detail-panel">
              <div className="gt-detail-header">
                <span className="gt-detail-title">任务详情</span>
                <button className="gt-detail-close" onClick={() => setDetailOpen(false)}>✕</button>
              </div>
              <div className="gt-detail-body">
                <div className="gt-detail-field">
                  <label>任务名称</label>
                  <input
                    defaultValue={detailTask.name}
                    onChange={(e) => saveDetail('name', e.target.value)}
                  />
                </div>
                <div className="gt-detail-field">
                  <label>开始日期</label>
                  <input
                    defaultValue={typeof detailTask.startDate === 'string' ? detailTask.startDate : (detailTask.startDate ? String(detailTask.startDate) : '')}
                    onChange={(e) => saveDetail('startDate', e.target.value)}
                  />
                </div>
                <div className="gt-detail-field">
                  <label>结束日期</label>
                  <input
                    defaultValue={typeof detailTask.endDate === 'string' ? detailTask.endDate : (detailTask.endDate ? String(detailTask.endDate) : '')}
                    onChange={(e) => saveDetail('endDate', e.target.value)}
                  />
                </div>
                <div className="gt-detail-field">
                  <label>进度</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={detailTask.progress ?? 0}
                    onChange={(e) => saveDetail('progress', Number(e.target.value))}
                  />
                  <span className="gt-detail-suffix">%</span>
                </div>
                <div className="gt-detail-field">
                  <label>负责人</label>
                  <input
                    defaultValue={typeof detailTask.owner === 'string' ? detailTask.owner : detailTask.owner?.name ?? ''}
                    onChange={(e) => saveDetail('owner', e.target.value)}
                  />
                </div>
                <div className="gt-detail-field">
                  <label>里程碑</label>
                  <input
                    type="checkbox"
                    defaultChecked={!!detailTask.milestone}
                    onChange={(e) => saveDetail('milestone', e.target.checked)}
                  />
                </div>
                {detailTask.children?.length ? (
                  <div className="gt-detail-field">
                    <label>子任务数</label>
                    <span className="gt-detail-readonly">{detailTask.children.length}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </GanttContext.Provider>
  )
})

/** 右键菜单 */
const CtxMenuPortal = memo(function CtxMenuPortal({ menu, i18n, onAction, onClose }: {
  menu: { x: number; y: number; task: GanttTask }
  i18n: GanttLabels
  onAction: (action: string) => void
  onClose: () => void
}) {
  const items = [
    { id: 'delete', label: i18n.deleteTask },
    { id: 'add-link', label: i18n.addLink },
    { id: 'copy-dates', label: i18n.copyDates },
    { id: 'snap-here', label: i18n.snapHere }
  ]
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      className="gt-ctx-menu"
      style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 3000 }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map(item => (
        <div key={item.id} className="gt-ctx-item" onClick={() => onAction(item.id)}>
          {item.label}
        </div>
      ))}
    </div>
  )
})