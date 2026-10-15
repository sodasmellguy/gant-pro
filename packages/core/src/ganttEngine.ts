/**
 * GanttEngine — 甘特图核心状态引擎
 *
 * 框架无关的状态管理，基于 Signal/Computed 响应式原语。
 * 替代原 Vue 专属的 store.ts，可被 Vue / React / Solid 等适配层消费。
 */

import { Signal } from './reactive'
import type {
  GanttTask, GanttLink, FieldMap, ScaleType, LinkType,
  HolidayItem, SnapConfig, GanttLabels, TaskChangePayload
} from './types'
import {
  addDays, addHours, diffDays, endOfWeek,
  fmt,
  startOfDay, startOfWeek,
  toDate, toDateWithTime
} from './date'
import {
  getPxPerDay, createTimeConverter, barWidth,
  generateTopTicks, generateBottomTicks, generateWeekendCols,
  routeLink, type Tick, type Geom, type LinkPath
} from './geometry'
import { computeCriticalIds, type DatesOfFn, type WalkFn } from './criticalPath'
import { rescheduleFrom } from './reschedule'

// ==================== 类型导出 ====================

export interface EngineOptions {
  scale: ScaleType
  rowHeight: number
  barHeight: number
  readonly: boolean
  allowLink: boolean
  showBaseline: boolean
  autoReschedule: boolean
  filterOwner: string | null
  showCriticalPath: boolean
  hourWidth: number
  linkedResize: boolean
  rowDraggable: boolean
  fieldMap: Partial<FieldMap>
  holidays: HolidayItem[]
  levelColor: boolean | string[]
  links: GanttLink[]
  snap: boolean | SnapConfig
  showExpectedProgress: boolean
  rangeStart: string | Date | null
  rangeEnd: string | Date | null
  moveByUnit: boolean
  progressDecimal: number
  labels: GanttLabels
  /** 拖拽时吸附到其他任务条边缘（px 阈值，默认 0=禁用） */
  snapToTask?: number
}

export interface RowItem {
  task: GanttTask
  depth: number
  hasChildren: boolean
  index: number
  summary: boolean
}

export type DragMode = 'move' | 'left' | 'right' | 'progress'

export interface RescheduleChange {
  task: GanttTask
  oldStartDate?: string
  oldEndDate?: string
}

export interface HistoryEntry {
  id: string
  before: { name?: string; startDate?: string | Date; endDate?: string | Date; progress?: number }
  after: { name?: string; startDate?: string | Date; endDate?: string | Date; progress?: number }
}

export interface DragState {
  id: string
  mode: DragMode
  deltaDays: number
  origStart: Date
  origEnd: Date
  progress: number
}

// ==================== 工具函数 ====================

function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clone) as unknown as T
  if (v && typeof v === 'object') {
    const o: any = {}
    for (const k in v as any) o[k] = clone((v as any)[k])
    return o
  }
  return v
}

function snapTask(t: GanttTask) {
  return { name: t.name, startDate: t.startDate, endDate: t.endDate, progress: t.progress ?? 0 }
}

function getPath(obj: any, path: string): any {
  if (!obj || !path) return undefined
  const keys = path.split('.')
  let cur = obj
  for (const k of keys) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

// ==================== GanttEngine ====================

export class GanttEngine {
  // ===== 响应式状态 =====
  readonly data: Signal<GanttTask[]>
  readonly options: Signal<EngineOptions>
  readonly collapsed: Set<string>
  readonly selectedId: Signal<string | null>
  readonly hoverId: Signal<string | null>
  readonly dragVersion: Signal<number>
  readonly linkDraftVersion: Signal<number>

  // ===== 撤销/重做 =====
  readonly undoStack: HistoryEntry[][] = []
  readonly redoStack: HistoryEntry[][] = []

  // ===== 拖拽状态 =====
  private drag: DragState | null = null
  private linkDraft: { fromId: string; x1: number; y1: number; x2: number; y2: number } | null = null
  private contentEl: HTMLElement | null = null
  /** 拖拽安全超时：超过此时间无 pointermove/up 则回收拖拽状态 */
  private dragTimeoutId: ReturnType<typeof setTimeout> | null = null
  private static DRAG_TIMEOUT_MS = 30_000

  // ===== 派生缓存 =====
  private _flatRowsCache: RowItem[] | null = null
  private _flatRowsVersion = -1
  private _geomsCache: Map<string, Geom> | null = null
  private _geomsVersion = -1
  private _criticalCache: Set<string> | null = null
  private _criticalVersion = -1

  // ===== 事件订阅器 =====
  private _listeners = new Map<string, Set<Function>>()

  constructor(data: GanttTask[], options: EngineOptions) {
    this.data = new Signal(clone(data))
    this.options = new Signal({ ...options })
    this.collapsed = new Set()
    this.selectedId = new Signal<string | null>(null)
    this.hoverId = new Signal<string | null>(null)
    this.dragVersion = new Signal(0)
    this.linkDraftVersion = new Signal(0)

    // 收集初始折叠状态
    const collectCollapsed = (arr: GanttTask[]) => {
      for (const t of arr) {
        if (t.collapsed) this.collapsed.add(t.id)
        if (t.children?.length) collectCollapsed(t.children)
      }
    }
    collectCollapsed(this.data.value)
  }

  // ==================== 字段映射 ====================
  get F() {
    const fm = this.options.value.fieldMap ?? {}
    return {
      id: fm.id ?? 'id',
      name: fm.name ?? 'name',
      start: fm.start ?? 'startDate',
      end: fm.end ?? 'endDate',
      progress: fm.progress ?? 'progress',
      children: fm.children ?? 'children'
    }
  }

  taskField(t: GanttTask, field: 'id' | 'name' | 'start' | 'end' | 'progress' | 'children'): any {
    const key = this.F[field]
    if (field === 'name' || field === 'progress') return getPath(t, key)
    return t[key] ?? getPath(t, key)
  }

  // ==================== 遍历 ====================
  walk: WalkFn = (list, fn) => {
    const visited = new Set<GanttTask>()
    const rec = (arr: GanttTask[]) => {
      for (const t of arr) {
        if (visited.has(t)) { console.warn('[gantt] 循环引用，跳过'); continue }
        visited.add(t)
        fn(t)
        const kids = t[this.F.children] ?? t.children
        if (kids?.length) rec(kids)
      }
    }
    rec(list)
  }

  findTask(id: string): GanttTask | null {
    let found: GanttTask | null = null
    this.walk(this.data.value, t => {
      if (t[this.F.id] === id || t.id === id) found = t
    })
    return found
  }

  /** 查找任务的祖先链（从近到远） */
  findAncestors(id: string): GanttTask[] {
    const result: GanttTask[] = []
    const ck = this.F.children
    const rec = (list: GanttTask[], parent: GanttTask | null): boolean => {
      for (const t of list) {
        const tid = t[this.F.id] ?? t.id
        if (tid === id) { if (parent) result.push(parent); return true }
        const kids = t[ck] ?? t.children ?? []
        if (kids.length && rec(kids, t)) { if (parent) result.push(parent); return true }
      }
      return false
    }
    rec(this.data.value, null)
    return result
  }

  // ==================== 数据更新 ====================
  setData(tasks: GanttTask[]): void {
    this.data.value = clone(tasks)
    this.collapsed.clear()
    const collect = (arr: GanttTask[]) => {
      for (const t of arr) {
        if (t.collapsed) this.collapsed.add(t.id)
        if (t.children?.length) collect(t.children)
      }
    }
    collect(this.data.value)
    this.undoStack.length = 0
    this.redoStack.length = 0
    // 使缓存失效
    this.dragVersion.value++
  }

  updateOptions(patch: Partial<EngineOptions>): void {
    this.options.value = { ...this.options.value, ...patch }
    // 使缓存失效
    this.dragVersion.value++
  }

  // ==================== 计算属性 ====================
  get isHour(): boolean { return this.options.value.scale === 'hour' }

  get parseDate(): (v: string | Date) => Date {
    return this.isHour ? toDateWithTime : (v: string | Date) => startOfDay(toDate(v))
  }

  get pxPerDay(): number {
    const o = this.options.value
    return getPxPerDay(o.scale, o.hourWidth)
  }

  get minStart(): Date {
    let m: Date | null = null
    this.walk(this.data.value, t => {
      const s = t[this.F.start] ? this.parseDate(t[this.F.start]) : null
      if (s && (!m || s < m)) m = s
    })
    return m ?? startOfDay(new Date())
  }

  get maxEnd(): Date {
    let m: Date | null = null
    this.walk(this.data.value, t => {
      const e = t[this.F.end] ? this.parseDate(t[this.F.end]) : null
      const d = e ?? (t[this.F.start] ? this.parseDate(t[this.F.start]) : null)
      if (d && (!m || d > m)) m = d
    })
    return m ?? addDays(startOfDay(new Date()), 30)
  }

  get chartStart(): Date {
    const o = this.options.value
    if (o.rangeStart) return startOfDay(toDate(o.rangeStart))
    return startOfWeek(addDays(this.minStart, -2))
  }

  get chartEnd(): Date {
    const o = this.options.value
    if (o.rangeEnd) return startOfDay(toDate(o.rangeEnd))
    return endOfWeek(addDays(this.maxEnd, 21))
  }

  get totalDays(): number { return diffDays(this.chartStart, this.chartEnd) + 1 }

  get contentWidth(): number { return Math.round(this.totalDays * this.pxPerDay) }

  private _timeConverter() {
    return createTimeConverter(this.chartStart, this.options.value.scale, this.pxPerDay, this.options.value.hourWidth)
  }

  timeToX(ts: number): number { return this._timeConverter().timeToX(ts) }
  xToTime(px: number): number { return this._timeConverter().xToTime(px) }

  get todayX(): number {
    const t = startOfDay(new Date())
    return t >= this.chartStart && t <= this.chartEnd ? this.timeToX(t.getTime()) : -1
  }

  // ==================== 刻度 ====================
  get topTicks(): Tick[] {
    void this.dragVersion.value
    return generateTopTicks(
      this.chartStart, this.chartEnd,
      this.options.value.scale, this.pxPerDay, this.options.value.hourWidth,
      this.options.value.labels
    )
  }

  get bottomTicks(): Tick[] {
    void this.dragVersion.value
    return generateBottomTicks(
      this.chartStart, this.chartEnd,
      this.options.value.scale, this.pxPerDay, this.options.value.hourWidth,
      this.options.value.labels
    )
  }

  get weekendCols(): { left: number; width: number }[] {
    return generateWeekendCols(this.chartStart, this.chartEnd, this.options.value.scale, this.pxPerDay)
  }

  /** 自定义假日背景列 */
  get holidayCols(): { left: number; width: number; color?: string; label?: string }[] {
    const hols = this.options.value.holidays
    if (!hols?.length) return []
    const res: { left: number; width: number; color?: string; label?: string }[] = []
    for (const h of hols) {
      const d = toDate(h.date)
      if (d < this.chartStart || d > this.chartEnd) continue
      res.push({ left: this.timeToX(startOfDay(d).getTime()), width: this.pxPerDay, color: h.color, label: h.label })
    }
    return res
  }

  /** 层级行背景色：false=透明，true=默认调色板，数组=自定义循环取色 */
  levelBgColor(depth: number): string {
    const lc = this.options.value.levelColor
    if (!lc) return 'transparent'
    if (Array.isArray(lc)) {
      return lc[depth % lc.length] ?? 'transparent'
    }
    const palette = ['var(--gt-level-0)', 'var(--gt-level-1)', 'var(--gt-level-2)', 'var(--gt-level-3)']
    return palette[depth % palette.length]
  }

  /** 当前是否有进行中的拖拽 */
  get dragging(): boolean {
    return this.drag !== null
  }

  // ==================== 可见行 ====================
  private ownerName(t: GanttTask): string {
    const o = t.owner
    return typeof o === 'string' ? o : (o?.name ?? '')
  }

  private visibleIds(): Set<string> | null {
    const f = this.options.value.filterOwner
    if (!f) return null
    const set = new Set<string>()
    const rec = (t: GanttTask): boolean => {
      let any = this.ownerName(t) === f
      for (const c of t.children ?? []) any = rec(c) || any
      if (any) set.add(t.id)
      return any
    }
    for (const t of this.data.value) rec(t)
    return set
  }

  get flatRows(): RowItem[] {
    const ver = this.dragVersion.value
    // 缓存命中：dragVersion 未变且 data 引用未变
    if (this._flatRowsCache && this._flatRowsVersion === ver) {
      return this._flatRowsCache
    }
    const rows: RowItem[] = []
    const vis = this.visibleIds()
    const ck = this.F.children
    const rec = (list: GanttTask[], depth: number) => {
      for (const t of list) {
        if (vis && !vis.has(t.id)) continue
        const kids = t[ck] ?? t.children ?? []
        const hasChildren = vis
          ? !!(kids.some((c: GanttTask) => vis.has(c.id)))
          : !!kids.length
        rows.push({ task: t, depth, hasChildren, index: rows.length, summary: !!kids.length })
        if (hasChildren && !this.collapsed.has(t.id)) rec(kids, depth + 1)
      }
    }
    rec(this.data.value, 0)
    this._flatRowsCache = rows
    this._flatRowsVersion = ver
    return rows
  }

  get rowsTotalHeight(): number { return this.flatRows.length * this.options.value.rowHeight }

  // ==================== 日期计算 ====================
  private ownDates(t: GanttTask, d?: DragState | null): { start: Date | null; end: Date | null } {
    const st = d ?? this.drag
    const sk = this.F.start
    const ek = this.F.end
    let s = t[sk] ? this.parseDate(t[sk]) : null
    let e = t[ek] ? this.parseDate(t[ek]) : null
    if (!s && e) s = e
    if (!e && s) e = s
    if (st && st.id === t.id && s && e) {
      if (st.mode === 'move') {
        s = addDays(s, st.deltaDays)
        e = addDays(e, st.deltaDays)
      } else if (st.mode === 'left') {
        s = addDays(s, Math.min(st.deltaDays, diffDays(e, s)))
      } else if (st.mode === 'right') {
        e = addDays(e, Math.max(st.deltaDays, -diffDays(e, s)))
      }
    }
    return { start: s, end: e }
  }

  private visibleChildren(t: GanttTask): GanttTask[] {
    const ck = this.F.children
    const kids = t[ck] ?? t.children ?? []
    const vis = this.visibleIds()
    return vis ? kids.filter((c: GanttTask) => vis.has(c.id)) : kids
  }

  private ownBaseDates(t: GanttTask): { start: Date | null; end: Date | null } {
    let s = t.baselineStart ? this.parseDate(t.baselineStart) : null
    let e = t.baselineEnd ? this.parseDate(t.baselineEnd) : null
    if (!s && e) s = e
    if (!e && s) e = s
    return { start: s, end: e }
  }

  /** 基准（计划）日期：汇总行取子树极值，与 effDates 同构 */
  private baseDates(t: GanttTask): { start: Date | null; end: Date | null } {
    const kids = this.visibleChildren(t)
    if (kids.length) {
      let s: Date | null = null
      let e: Date | null = null
      for (const c of kids) {
        const d = this.baseDates(c)
        if (d.start && (!s || d.start < s)) s = d.start
        if (d.end && (!e || d.end > e)) e = d.end
      }
      if (s && e) return { start: s, end: e }
    }
    return this.ownBaseDates(t)
  }

  private effDates(t: GanttTask): { start: Date | null; end: Date | null } {
    const kids = this.visibleChildren(t)
    if (kids.length) {
      let s: Date | null = null
      let e: Date | null = null
      for (const c of kids) {
        const d = this.effDates(c)
        if (d.start && (!s || d.start < s)) s = d.start
        if (d.end && (!e || d.end > e)) e = d.end
      }
      if (s && e) return { start: s, end: e }
    }
    const o = this.ownDates(t)
    return { start: o.start, end: t.milestone ? null : o.end }
  }

  summaryProgress(t: GanttTask): number {
    const kids = this.visibleChildren(t)
    if (!kids.length) {
      const p = t.progress ?? 0
      return Math.max(0, Math.min(100, p))
    }
    let sum = 0
    for (const c of kids) sum += this.summaryProgress(c)
    return Math.max(0, Math.min(100, Math.round(sum / kids.length)))
  }

  // ==================== 关键路径 ====================
  private datesOf: DatesOfFn = (t: GanttTask) => {
    const ck = this.F.children
    const kids = t[ck] ?? t.children
    return kids?.length ? this.effDates(t) : this.ownDates(t, null)
  }

  get criticalIds(): Set<string> {
    if (!this.options.value.showCriticalPath) return new Set()
    const ver = this.dragVersion.value
    if (this._criticalCache && this._criticalVersion === ver) {
      return this._criticalCache
    }
    const result = computeCriticalIds(this.data.value, this.options.value.links, this.datesOf, this.walk)
    this._criticalCache = result
    this._criticalVersion = ver
    return result
  }

  // ==================== 条形几何 ====================
  get geoms(): Map<string, Geom> {
    const ver = this.dragVersion.value
    // 缓存命中
    if (this._geomsCache && this._geomsVersion === ver) {
      return this._geomsCache
    }
    const o = this.options.value
    const rh = o.rowHeight
    const bh = Math.max(8, Math.min(o.barHeight, rh - 8))
    const p = this.pxPerDay
    const withBase = o.showBaseline
    const crit = this.criticalIds
    const m = new Map<string, Geom>()
    const xFn = (d: Date) => this.timeToX(d.getTime())
    const bwFn = (s: Date, e: Date) => barWidth(s, e, o.scale, p, o.hourWidth)
    for (const row of this.flatRows) {
      const t = row.task
      let d: { start: Date | null; end: Date | null }
      try {
        d = this.effDates(t)
      } catch (err) {
        console.warn('[gantt] 计算条形几何失败:', t.id, err)
        continue
      }
      if (!d.start) continue
      const y = row.index * rh
      const critical = !row.summary && crit.has(t.id)
      let baseline = false, bx = 0, bw = 0, overdue = false
      if (withBase) {
        const b = this.baseDates(t)
        if (b.start && b.end) {
          baseline = true
          bx = xFn(b.start)
          bw = bwFn(b.start, b.end)
          const finish = d.end ?? d.start
          overdue = !!(finish && finish > b.end)
        }
      }
      if (row.summary) {
        if (!d.end) continue
        m.set(t.id, { id: t.id, task: t, x: xFn(d.start), w: bwFn(d.start, d.end), y, h: bh, milestone: false, summary: true, baseline, bx, bw, overdue, critical })
      } else if (t.milestone) {
        m.set(t.id, { id: t.id, task: t, x: xFn(d.start), w: p, y, h: bh, milestone: true, summary: false, baseline, bx, bw, overdue, critical })
      } else {
        if (!d.end) continue
        const geom: Geom = { id: t.id, task: t, x: xFn(d.start), w: bwFn(d.start, d.end), y, h: bh, milestone: false, summary: false, baseline, bx, bw, overdue, critical }
        if (t.segments?.length) {
          geom.segments = t.segments.map(s => {
            const ss = this.parseDate(s.startDate)
            const se = this.parseDate(s.endDate)
            if (!ss || !se) return null
            return { x: xFn(ss), w: bwFn(ss, se), progress: s.progress, color: s.color }
          }).filter(Boolean as any) as { x: number; w: number; progress?: number; color?: string }[]
        }
        if (o.showExpectedProgress && t.expectedProgress != null && t.expectedProgress > 0) {
          geom.expectedX = geom.x + geom.w * (t.expectedProgress / 100)
        }
        m.set(t.id, geom)
      }
    }
    this._geomsCache = m
    this._geomsVersion = ver
    return m
  }

  // ==================== 依赖连线 ====================
  get linkPaths(): LinkPath[] {
    void this.dragVersion.value
    const g = this.geoms
    const crit = this.criticalIds
    const res: LinkPath[] = []
    for (const l of this.options.value.links ?? []) {
      const a = g.get(l.from)
      const b = g.get(l.to)
      if (!a || !b) continue
      const critical = crit.has(l.from) && crit.has(l.to)
      res.push({
        key: `${l.from}>${l.to}:${l.type ?? 'fs'}`,
        link: l,
        d: routeLink(a, b, l.type ?? 'fs'),
        color: l.color ?? (critical ? 'var(--gt-danger)' : 'var(--gt-link)'),
        critical
      })
    }
    return res
  }

  get linkDraftLine() {
    void this.linkDraftVersion.value
    return this.linkDraft ? { ...this.linkDraft } : null
  }

  // ==================== 展开折叠 ====================
  toggleExpand(t: GanttTask): void {
    const ck = this.F.children
    const kids = t[ck] ?? t.children
    if (!kids?.length) return
    const willExpand = this.collapsed.has(t.id)
    if (willExpand) this.collapsed.delete(t.id)
    else this.collapsed.add(t.id)
    // collapsed 是普通 Set，适配层依赖 dragVersion 感知变更
    this.dragVersion.value++
    this._emit('expand', t, willExpand)
  }

  expandAll(v: boolean): void {
    const ck = this.F.children
    this.walk(this.data.value, t => {
      const kids = t[ck] ?? t.children
      if (kids?.length) {
        if (v) this.collapsed.delete(t.id)
        else this.collapsed.add(t.id)
      }
    })
    this.dragVersion.value++
  }

  isCollapsed(id: string): boolean { return this.collapsed.has(id) }

  // ==================== 撤销/重做 ====================
  get canUndo(): boolean { return this.undoStack.length > 0 }
  get canRedo(): boolean { return this.redoStack.length > 0 }

  private recordHistory(entry: HistoryEntry[]): void {
    if (!entry.length) return
    this.undoStack.push(entry)
    if (this.undoStack.length > 100) this.undoStack.shift()
    this.redoStack.length = 0
  }

  undo(): HistoryEntry[] | null {
    const entry = this.undoStack.pop()
    if (!entry) return null
    for (const c of entry) {
      const t = this.findTask(c.id)
      if (t) Object.assign(t, c.before)
    }
    this.redoStack.push(entry)
    this.dragVersion.value++
    return entry
  }

  redo(): HistoryEntry[] | null {
    const entry = this.redoStack.pop()
    if (!entry) return null
    for (const c of entry) {
      const t = this.findTask(c.id)
      if (t) Object.assign(t, c.after)
    }
    this.undoStack.push(entry)
    this.dragVersion.value++
    return entry
  }

  // ==================== 编辑 ====================
  /** 行内编辑（名称/进度）。与参考实现一致：不在此钳制进度，由 UI 层负责 */
  editTask(id: string, patch: { name?: string; progress?: number }): void {
    const t = this.findTask(id)
    if (!t) return
    const before = snapTask(t)
    if (patch.name != null) t.name = patch.name
    if (patch.progress != null) t.progress = patch.progress
    this.recordHistory([{ id, before, after: snapTask(t) }])
    this.dragVersion.value++
    this._emit('commit', {
      task: t, mode: 'edit' as any,
      oldName: before.name,
      oldStartDate: before.startDate, oldEndDate: before.endDate, oldProgress: before.progress
    } as TaskChangePayload)
  }

  deleteTask(id: string): void {
    const ck = this.F.children
    const find = (list: GanttTask[], parent: GanttTask | null): { siblings: GanttTask[]; parent: GanttTask | null } | null => {
      for (const t of list) {
        if ((t[this.F.id] ?? t.id) === id) return { siblings: list, parent }
      }
      for (const t of list) {
        const kids = t[ck] ?? t.children ?? []
        if (kids.length) {
          const r = find(kids, t)
          if (r) return r
        }
      }
      return null
    }
    const r = find(this.data.value, null)
    if (!r) return
    const idx = r.siblings.findIndex(t => (t[this.F.id] ?? t.id) === id)
    if (idx < 0) return
    const task = r.siblings[idx]
    const before = snapTask(task)
    r.siblings.splice(idx, 1)
    // 删除相关连线
    const links = this.options.value.links
    if (links) {
      const filtered = links.filter(l => l.from !== id && l.to !== id)
      if (filtered.length !== links.length) {
        this.updateOptions({ links: filtered })
      }
    }
    this.recordHistory([{ id, before, after: { ...before, name: before.name + ' (deleted)' } }])
    this.dragVersion.value++
    this._emit('commit', {
      task, mode: 'edit' as any, oldName: before.name,
      oldStartDate: before.startDate, oldEndDate: before.endDate, oldProgress: before.progress
    } as TaskChangePayload)
  }

  // ==================== 拖拽 ====================
  startDrag(e: PointerEvent, task: GanttTask, mode: DragMode): void {
    if (this.options.value.readonly || this.drag) return
    // 汇总行不可拖拽（与参考实现一致）
    const row = this.flatRows.find(r => r.task.id === task.id)
    if (!row || row.summary) return
    const od = this.ownDates(task, null)
    if (!od.start || (!task.milestone && !od.end)) return
    e.preventDefault()
    const startX = e.clientX
    const useHour = this.isHour
    const o = this.options.value
    // ---- Snap / moveByUnit 配置解析 ----
    const snapVal = o.snap
    const moveByUnit = o.moveByUnit
    const snapEnabled = snapVal !== false && snapVal !== undefined || moveByUnit
    const snapStep = typeof snapVal === 'object' && snapVal ? (snapVal.step ?? 1) : 1
    // hour 刻度下吸附单位 = snapStep 小时，其它 = snapStep 天
    const unitPx = useHour ? o.hourWidth * snapStep : this.pxPerDay * snapStep
    const rawUnitPx = useHour ? o.hourWidth : this.pxPerDay
    const fmtDate = (d: Date) => useHour ? fmt(d, 'YYYY-MM-DDTHH:mm') : fmt(d)
    const g = this.geoms.get(task.id)
    const barW = g?.w ?? 1
    const origProgress = task.progress ?? 0
    this.drag = {
      id: task.id,
      mode,
      deltaDays: 0,
      origStart: od.start,
      origEnd: od.end ?? od.start,
      progress: origProgress
    }
    this.dragVersion.value++
    const onMove = (ev: PointerEvent) => {
      if (!this.drag) return
      // 重置安全超时
      this.resetDragTimeout()
      const dx = ev.clientX - startX
      if (mode === 'progress') {
        this.drag.progress = Math.max(0, Math.min(100, Math.round(origProgress + (dx / Math.max(barW, 1)) * 100)))
      } else if (snapEnabled) {
        this.drag.deltaDays = Math.round(dx / unitPx) * snapStep
      } else {
        this.drag.deltaDays = Math.round(dx / rawUnitPx)
      }
      // ---- 拖拽吸附到其他任务条边缘 ----
      const snapThreshold = o.snapToTask ?? 0
      if (snapThreshold > 0 && mode !== 'progress' && this.drag.deltaDays !== 0) {
        const curGeom = this.geoms.get(task.id)
        if (curGeom) {
          const curX = curGeom.x + this.drag.deltaDays * rawUnitPx
          const curRight = curX + curGeom.w
          let bestSnap = 0
          let bestDist = snapThreshold
          for (const [otherId, otherG] of this.geoms) {
            if (otherId === task.id) continue
            // 检查左边缘吸附到其他条的左/右边缘
            const distL = Math.abs(curX - otherG.x)
            if (distL < bestDist) { bestDist = distL; bestSnap = otherG.x - curGeom.x }
            const distR = Math.abs(curX - (otherG.x + otherG.w))
            if (distR < bestDist) { bestDist = distR; bestSnap = otherG.x + otherG.w - curGeom.x }
            // 检查右边缘吸附到其他条的左/右边缘
            const distRL = Math.abs(curRight - otherG.x)
            if (distRL < bestDist) { bestDist = distRL; bestSnap = otherG.x - curGeom.x - curGeom.w }
            const distRR = Math.abs(curRight - (otherG.x + otherG.w))
            if (distRR < bestDist) { bestDist = distRR; bestSnap = otherG.x + otherG.w - curGeom.x - curGeom.w }
          }
          if (bestSnap !== 0) {
            this.drag.deltaDays = Math.round(bestSnap / rawUnitPx)
          }
        }
      }
      this.dragVersion.value++
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      this.clearDragTimeout()
      const cur = this.drag
      this.drag = null
      this.dragVersion.value++
      if (!cur) return
      const t = this.findTask(task.id)
      if (!t) return
      const before = snapTask(t)
      let changed = false
      if (mode === 'progress') {
        if (cur.progress !== origProgress) { t.progress = cur.progress; changed = true }
      } else if (cur.deltaDays !== 0) {
        // hour 刻度下 deltaDays 实际为小时数
        const s = useHour ? addHours(cur.origStart, cur.deltaDays) : addDays(cur.origStart, cur.deltaDays)
        const en = useHour ? addHours(cur.origEnd, cur.deltaDays) : addDays(cur.origEnd, cur.deltaDays)
        if (mode === 'move') {
          t.startDate = fmtDate(s)
          t.endDate = fmtDate(en)
          changed = true
        } else if (mode === 'left' && (useHour ? s <= cur.origEnd : diffDays(s, cur.origEnd) >= 0)) {
          t.startDate = fmtDate(s)
          changed = true
        } else if (mode === 'right' && (useHour ? en >= cur.origStart : diffDays(cur.origStart, en) >= 0)) {
          t.endDate = fmtDate(en)
          changed = true
        }
      }
      if (!changed) return
      // 父子联动缩放：拖叶子时自底向上重算祖先日期
      const batchHistory: HistoryEntry[] = [{ id: t.id, before, after: snapTask(t) }]
      if (o.linkedResize && mode !== 'progress') {
        const sk = this.F.start
        const ek = this.F.end
        for (const p of this.findAncestors(t.id)) {
          const kids = p[this.F.children] ?? p.children ?? []
          if (!kids.length) continue
          const pBefore = snapTask(p)
          let ps: Date | null = null
          let pe: Date | null = null
          for (const c of kids) {
            const d = this.effDates(c)
            if (d.start && (!ps || d.start < ps)) ps = d.start
            if (d.end && (!pe || d.end > pe)) pe = d.end
          }
          if (ps && pe) {
            p[sk] = fmtDate(ps)
            if (!p.milestone) p[ek] = fmtDate(pe)
            batchHistory.push({ id: p.id, before: pBefore, after: snapTask(p) })
          }
        }
      }
      this.recordHistory(batchHistory)
      this.dragVersion.value++
      this._emit('commit', {
        task: t, mode,
        oldStartDate: fmtDate(cur.origStart), oldEndDate: fmtDate(cur.origEnd), oldProgress: origProgress
      } as TaskChangePayload)
      // 依赖联动顺推：只对日期类拖拽生效
      if (mode !== 'progress' && o.autoReschedule) {
        const changes = rescheduleFrom(t.id, this.data.value, o.links ?? [], this.datesOf, this.walk, this.isHour)
        if (changes.length) {
          this.recordHistory(changes.map(c => ({
            id: c.task.id,
            before: { name: c.task.name, startDate: c.oldStartDate, endDate: c.oldEndDate, progress: c.task.progress },
            after: snapTask(c.task)
          })))
          this._emit('reschedule', changes)
        }
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    // 启动安全超时
    this.resetDragTimeout()
  }
  startLinkDraft(e: PointerEvent, task: GanttTask): void {
    if (this.options.value.readonly || !this.options.value.allowLink || this.linkDraft) return
    const g = this.geoms.get(task.id)
    if (!g) return
    e.preventDefault()
    e.stopPropagation()
    this.linkDraft = {
      fromId: task.id,
      x1: g.milestone ? g.x + g.w / 2 : g.x + g.w,
      y1: g.y + g.h / 2,
      x2: g.milestone ? g.x + g.w / 2 : g.x + g.w,
      y2: g.y + g.h / 2
    }
    this.linkDraftVersion.value++
    const move = (ev: PointerEvent) => {
      if (!this.linkDraft) return
      // 重置安全超时
      this.resetDragTimeout()
      const p = this.toLocal(ev.clientX, ev.clientY)
      this.linkDraft.x2 = p.x
      this.linkDraft.y2 = p.y
      this.linkDraftVersion.value++
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      this.clearDragTimeout()
      const draft = this.linkDraft
      this.linkDraft = null
      this.linkDraftVersion.value++
      if (!draft) return
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
      const bar = el?.closest('[data-task-id]') as HTMLElement | null
      const toId = bar?.dataset.taskId
      if (toId && toId !== draft.fromId) {
        this._emit('linkCreate', { from: draft.fromId, to: toId })
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    // 启动安全超时
    this.resetDragTimeout()
  }

  // ==================== 拖拽安全超时 =================
  /** 重置拖拽安全超时计时器 */
  private resetDragTimeout(): void {
    this.clearDragTimeout()
    this.dragTimeoutId = setTimeout(() => {
      // 超时回收：清理拖拽状态和事件监听
      this.drag = null
      this.linkDraft = null
      this.dragVersion.value++
      this.linkDraftVersion.value++
    }, GanttEngine.DRAG_TIMEOUT_MS)
  }

  /** 清除拖拽安全超时计时器 */
  private clearDragTimeout(): void {
    if (this.dragTimeoutId != null) {
      clearTimeout(this.dragTimeoutId)
      this.dragTimeoutId = null
    }
  }

  // ==================== 坐标转换 ====================
  setContentEl(el: HTMLElement | null): void { this.contentEl = el }

  toLocal(cx: number, cy: number): { x: number; y: number } {
    if (!this.contentEl) return { x: 0, y: 0 }
    const rect = this.contentEl.getBoundingClientRect()
    return { x: cx - rect.left, y: cy - rect.top }
  }

  // ==================== 行排序 ====================
  moveRow(taskId: string, toIndex: number): { fromIndex: number; toIndex: number; parentId: string | null } | null {
    const ck = this.F.children
    const findSiblings = (id: string): { siblings: GanttTask[]; parent: GanttTask | null } => {
      const rec = (list: GanttTask[], parent: GanttTask | null): { siblings: GanttTask[]; parent: GanttTask | null } | null => {
        for (const t of list) {
          if ((t[this.F.id] ?? t.id) === id) return { siblings: list, parent }
        }
        for (const t of list) {
          const kids = t[ck] ?? t.children ?? []
          if (kids.length) {
            const r = rec(kids, t)
            if (r) return r
          }
        }
        return null
      }
      return rec(this.data.value, null) ?? { siblings: this.data.value, parent: null }
    }
    const r = findSiblings(taskId)
    const fromIndex = r.siblings.findIndex(t => (t[this.F.id] ?? t.id) === taskId)
    if (fromIndex < 0 || fromIndex === toIndex) return null
    const [moved] = r.siblings.splice(fromIndex, 1)
    const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex
    r.siblings.splice(adjustedTo, 0, moved)
    this.dragVersion.value++
    return { fromIndex, toIndex: adjustedTo, parentId: r.parent?.id ?? null }
  }

  // ==================== 事件系统 ====================
  on(event: string, fn: Function): () => void {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event)!.add(fn)
    return () => this._listeners.get(event)?.delete(fn)
  }

  private _emit(event: string, ...args: any[]): void {
    this._listeners.get(event)?.forEach(fn => fn(...args))
  }

  // ==================== 回调注册（便捷方法） ====================
  onCommit(fn: (p: TaskChangePayload) => void): () => void { return this.on('commit', fn) }
  onReschedule(fn: (changes: RescheduleChange[]) => void): () => void { return this.on('reschedule', fn) }
  onLinkCreate(fn: (p: { from: string; to: string }) => void): () => void { return this.on('linkCreate', fn) }
  onLinkClick(fn: (l: GanttLink) => void): () => void { return this.on('linkClick', fn) }
  onLinkDblClick(fn: (l: GanttLink) => void): () => void { return this.on('linkDblClick', fn) }
  onExpand(fn: (t: GanttTask, expanded: boolean) => void): () => void { return this.on('expand', fn) }
  onRowMove(fn: (p: { task: GanttTask; fromIndex: number; toIndex: number; parentId: string | null }) => void): () => void { return this.on('rowMove', fn) }

  emitLinkClick(l: GanttLink): void { this._emit('linkClick', l) }
  emitLinkDblClick(l: GanttLink): void { this._emit('linkDblClick', l) }

  // ==================== 连线编辑（删除/改类型/重连） ====================
  /** 查找连线索引（按 from + to + type 匹配） */
  private findLinkIndex(l: GanttLink): number {
    const links = this.options.value.links ?? []
    const t = l.type ?? 'fs'
    return links.findIndex(
      (x) => x.from === l.from && x.to === l.to && (x.type ?? 'fs') === t
    )
  }

  /** 删除连线 */
  removeLink(l: GanttLink): void {
    const links = this.options.value.links ?? []
    const idx = this.findLinkIndex(l)
    if (idx < 0) return
    const newLinks = [...links]
    newLinks.splice(idx, 1)
    this.updateOptions({ links: newLinks })
    this.dragVersion.value++
    this._emit('linkDelete', l)
  }

  /** 修改连线类型（fs/ss/ff/sf） */
  changeLinkType(l: GanttLink, type: LinkType): void {
    const links = this.options.value.links ?? []
    const idx = this.findLinkIndex(l)
    if (idx < 0) return
    const newLinks = [...links]
    newLinks[idx] = { ...newLinks[idx], type }
    this.updateOptions({ links: newLinks })
    this.dragVersion.value++
    this._emit('linkTypeChange', { old: l, new: newLinks[idx] })
  }

  /** 重连连线端点（from 或 to） */
  reconnectLink(l: GanttLink, side: 'from' | 'to', newTaskId: string): void {
    const links = this.options.value.links ?? []
    const idx = this.findLinkIndex(l)
    if (idx < 0) return
    if (newTaskId === l.from || newTaskId === l.to) return // 避免自环
    const newLinks = [...links]
    newLinks[idx] = {
      ...newLinks[idx],
      [side]: newTaskId
    } as GanttLink
    this.updateOptions({ links: newLinks })
    this.dragVersion.value++
    this._emit('linkReconnect', { old: l, new: newLinks[idx], side })
  }

  onLinkDelete(fn: (l: GanttLink) => void): () => void { return this.on('linkDelete', fn) }
  onLinkTypeChange(fn: (p: { old: GanttLink; new: GanttLink }) => void): () => void { return this.on('linkTypeChange', fn) }
  onLinkReconnect(fn: (p: { old: GanttLink; new: GanttLink; side: 'from' | 'to' }) => void): () => void { return this.on('linkReconnect', fn) }

  // ==================== 可见范围 ====================
  get visibleRange(): { start: Date; end: Date } {
    return { start: this.chartStart, end: this.chartEnd }
  }

  // ==================== 销毁 ====================
  destroy(): void {
    this._listeners.clear()
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.drag = null
    this.linkDraft = null
  }
}
