/**
 * 甘特图核心状态仓库（Vue 适配层）
 *
 * 自 @gantt-pro/core 迁移：业务逻辑（数据树 / 刻度 / 几何 / 拖拽 / 依赖 / 撤销）
 * 全部下沉到框架无关的 GanttEngine，本文件只负责把引擎桥接为 Vue 响应式 API。
 *
 * 桥接原理：
 * - 引擎状态用 Signal 承载，Vue 无法自动追踪，这里订阅 Signal 写入 Vue ref（ver / linkVer）
 * - 派生数据（flatRows / geoms / linkPaths …）在 computed 中先读取版本 ref 再调用引擎 getter
 * - options / data 通过 watch 同步进引擎；选中与悬浮用 customRef 双向代理引擎 Signal
 *
 * 公开 API 与旧版（纯 Vue 实现的 store.ts）保持完全兼容。
 */
import { computed, customRef, reactive, ref, watch, type InjectionKey, type Ref } from 'vue'
import { GanttEngine, type EngineOptions } from '@gantt-pro/core'
import type {
  GanttLink,
  GanttTask,
  FieldMap,
  ScaleType,
  TaskChangePayload,
  HolidayItem,
  SnapConfig,
  GanttLabels
} from '@gantt-pro/core'

export interface StoreOptions {
  scale: Ref<ScaleType>
  rowHeight: Ref<number>
  barHeight: Ref<number>
  readonly: Ref<boolean>
  allowLink: Ref<boolean>
  showBaseline: Ref<boolean>
  /** 拖拽提交后按依赖链自动顺推后续任务 */
  autoReschedule: Ref<boolean>
  /** 负责人筛选：只显示该负责人的任务及其父链，null 表示不过滤 */
  filterOwner: Ref<string | null>
  /** 高亮关键路径（CPM：浮时 <= 0 的任务与依赖线标红） */
  showCriticalPath: Ref<boolean>
  /** 小时刻度下每小时像素宽度（默认 24，即 576px/天） */
  hourWidth: Ref<number>
  /** 父子联动缩放：拖叶子时父条自动扩展，拖汇总条时子条跟随 */
  linkedResize: Ref<boolean>
  /** 行拖拽排序 */
  rowDraggable: Ref<boolean>
  /** 字段映射 */
  fieldMap: Ref<Partial<FieldMap>>
  /** 自定义假日 */
  holidays: Ref<HolidayItem[]>
  /** 层级背景色 */
  levelColor: Ref<boolean | string[]>
  links: Ref<GanttLink[]>
  /** 吸附对齐配置 */
  snap: Ref<boolean | SnapConfig>
  /** 右键菜单回调 */
  onContextMenu: Ref<((task: GanttTask, e: MouseEvent) => void) | null>
  /** 预期进度对比 */
  showExpectedProgress: Ref<boolean>
  /** 时间范围控制 */
  rangeStart: Ref<string | Date | null>
  rangeEnd: Ref<string | Date | null>
  /** 按刻度单位移动（moveByUnit），独立于 snap */
  moveByUnit: Ref<boolean>
  /** 进度小数位数 */
  progressDecimal: Ref<number>
  /** i18n 标签 */
  labels: Ref<GanttLabels>
  /** 拖拽吸附到其他任务条（px 阈值，0=禁用） */
  snapToTask: Ref<number>
}

// 引擎类型直通导出（组件层此前从本文件导入这些几何/条目类型）
export type { Geom, Tick, RowItem, HistoryEntry, DragMode, RescheduleChange } from '@gantt-pro/core'

/** 依赖顺推产生的变更记录（便于撤销/日志） */
export type { RescheduleChange as GanttRescheduleChange } from '@gantt-pro/core'

export function createGanttStore(rawData: Ref<GanttTask[]>, opts: StoreOptions) {
  // ---------------- 引擎构建 ----------------
  /** 把 StoreOptions 快照为引擎选项（可选字段兜底，兼容部分 ref 缺省的调用方） */
  const buildOptions = (): EngineOptions => ({
    scale: opts.scale.value,
    rowHeight: opts.rowHeight.value,
    barHeight: opts.barHeight.value,
    readonly: opts.readonly.value,
    allowLink: opts.allowLink.value,
    showBaseline: opts.showBaseline.value,
    autoReschedule: opts.autoReschedule.value,
    filterOwner: opts.filterOwner.value,
    showCriticalPath: opts.showCriticalPath.value,
    hourWidth: opts.hourWidth.value,
    linkedResize: opts.linkedResize.value,
    rowDraggable: opts.rowDraggable.value,
    fieldMap: opts.fieldMap.value,
    holidays: opts.holidays.value,
    levelColor: opts.levelColor.value,
    links: opts.links.value,
    snap: opts.snap.value,
    showExpectedProgress: opts.showExpectedProgress.value,
    rangeStart: opts.rangeStart.value,
    rangeEnd: opts.rangeEnd.value,
    moveByUnit: opts.moveByUnit?.value ?? false,
    snapToTask: opts.snapToTask?.value ?? 0,
    progressDecimal: opts.progressDecimal?.value ?? 0,
    labels: opts.labels?.value ?? ({} as GanttLabels)
  })

  const engine = new GanttEngine(rawData.value ?? [], buildOptions())

  // ---------------- 引擎 Signal → Vue ref 版本桥 ----------------
  /** 数据/几何总版本：flatRows、geoms、linkPaths 等派生数据的失效依据 */
  const ver = ref(0)
  /** 连线起草独立版本（拖拽起草时高频更新，避免牵动全部几何重算） */
  const linkVer = ref(0)

  /** 引擎数据引用（engine 内部克隆，mutations 原地发生） */
  const inner = ref(engine.data.value) as Ref<GanttTask[]>

  engine.data.subscribe(() => {
    inner.value = engine.data.value
    ver.value++
  })
  engine.dragVersion.subscribe(() => {
    ver.value++
  })
  engine.linkDraftVersion.subscribe(() => {
    linkVer.value++
  })

  // ---------------- options 同步（含深层 mutation，如 links.push） ----------------
  const optRefs = [
    opts.scale,
    opts.rowHeight,
    opts.barHeight,
    opts.readonly,
    opts.allowLink,
    opts.showBaseline,
    opts.autoReschedule,
    opts.filterOwner,
    opts.showCriticalPath,
    opts.hourWidth,
    opts.linkedResize,
    opts.rowDraggable,
    opts.fieldMap,
    opts.holidays,
    opts.levelColor,
    opts.links,
    opts.snap,
    opts.showExpectedProgress,
    opts.rangeStart,
    opts.rangeEnd,
    opts.moveByUnit,
    opts.progressDecimal,
    opts.labels,
    opts.snapToTask
  ].filter(Boolean)
  watch(
    optRefs,
    () => {
      engine.updateOptions(buildOptions())
      ver.value++
    },
    { deep: true }
  )

  // ---------------- 数据同步 ----------------
  // 内部变异（拖拽/编辑/撤销/重做）会 emit update:data 同步回父组件，
  // 此时 v === engine.data.value（同一引用），跳过 setData 以保留撤销栈；
  // 外部赋新值（如重置数据）时 v ≠ engine.data.value，正常替换。
  watch(
    rawData,
    (v) => {
      if (v === engine.data.value) return
      engine.setData(v ?? [])
    },
    { deep: true }
  )

  // ---------------- 选中 / 悬浮（双向代理引擎 Signal） ----------------
  const selectedId = bindSignalRef(engine, 'selectedId')
  const hoverId = bindSignalRef(engine, 'hoverId')

  // ---------------- 派生计算属性 ----------------
  const flatRows = computed(() => {
    void ver.value
    return engine.flatRows
  })
  const rowsTotalHeight = computed(() => {
    void ver.value
    return engine.rowsTotalHeight
  })
  const chartStart = computed(() => {
    void ver.value
    return engine.chartStart
  })
  const chartEnd = computed(() => {
    void ver.value
    return engine.chartEnd
  })
  const contentWidth = computed(() => {
    void ver.value
    return engine.contentWidth
  })
  const pxPerDay = computed(() => {
    void ver.value
    return engine.pxPerDay
  })
  const todayX = computed(() => {
    void ver.value
    return engine.todayX
  })
  const topTicks = computed(() => {
    void ver.value
    return engine.topTicks
  })
  const bottomTicks = computed(() => {
    void ver.value
    return engine.bottomTicks
  })
  const weekendCols = computed(() => {
    void ver.value
    return engine.weekendCols
  })
  const holidayCols = computed(() => {
    void ver.value
    return engine.holidayCols
  })
  const geoms = computed(() => {
    void ver.value
    return engine.geoms
  })
  const linkPaths = computed(() => {
    void ver.value
    return engine.linkPaths
  })
  const linkDraftLine = computed(() => {
    void linkVer.value
    return engine.linkDraftLine
  })
  const criticalIds = computed(() => {
    void ver.value
    return engine.criticalIds
  })
  const dragging = computed(() => {
    void ver.value
    return engine.dragging
  })
  const isHour = computed(() => opts.scale.value === 'hour')
  const canUndo = computed(() => {
    void ver.value
    return engine.canUndo
  })
  const canRedo = computed(() => {
    void ver.value
    return engine.canRedo
  })
  const visibleRange = computed(() => ({ start: chartStart.value, end: chartEnd.value }))

  // ---------------- 悬浮提示（UI 态，留在适配层） ----------------
  const tooltip = reactive({ visible: false, x: 0, y: 0, task: null as GanttTask | null })
  function showTip(e: MouseEvent, t: GanttTask) {
    tooltip.visible = true
    tooltip.x = e.clientX
    tooltip.y = e.clientY
    tooltip.task = t
  }
  function moveTip(e: MouseEvent) {
    tooltip.x = e.clientX
    tooltip.y = e.clientY
  }
  function hideTip() {
    tooltip.visible = false
  }

  // ---------------- 删除任务时同步回写 links（与旧版行为一致） ----------------
  function deleteTask(id: string) {
    engine.deleteTask(id)
    const links = engine.options.peek().links
    if (opts.links && links) opts.links.value = links
  }

  return {
    inner,
    flatRows,
    rowsTotalHeight,
    chartStart,
    chartEnd,
    contentWidth,
    pxPerDay,
    todayX,
    topTicks,
    bottomTicks,
    weekendCols,
    geoms,
    linkPaths,
    linkDraftLine,
    selectedId,
    hoverId,
    rowHeight: opts.rowHeight,
    allowLink: opts.allowLink,
    readonly: opts.readonly,
    tooltip,
    dragging,
    summaryProgress: (t: GanttTask) => engine.summaryProgress(t),
    findTask: (id: string) => engine.findTask(id),
    criticalIds,
    canUndo,
    canRedo,
    undo: () => engine.undo(),
    redo: () => engine.redo(),
    editTask: (id: string, patch: { name?: string; progress?: number }) => engine.editTask(id, patch),
    deleteTask,
    isCollapsed: (id: string) => engine.isCollapsed(id),
    toggleExpand: (t: GanttTask) => engine.toggleExpand(t),
    expandAll: (v: boolean) => engine.expandAll(v),
    startDrag: (e: PointerEvent, task: GanttTask, mode: Parameters<GanttEngine['startDrag']>[2]) =>
      engine.startDrag(e, task, mode),
    startLinkDraft: (e: PointerEvent, task: GanttTask) => engine.startLinkDraft(e, task),
    setContentEl: (el: HTMLElement | null) => engine.setContentEl(el),
    toLocal: (cx: number, cy: number) => engine.toLocal(cx, cy),
    showTip,
    moveTip,
    hideTip,
    /** 统一几何换算入口 */
    timeToX: (ts: number) => engine.timeToX(ts),
    xToTime: (px: number) => engine.xToTime(px),
    isHour,
    /** 第2-4批新增 */
    holidayCols,
    levelBgColor: (depth: number) => engine.levelBgColor(depth),
    findAncestors: (id: string) => engine.findAncestors(id),
    moveRow: (taskId: string, toIndex: number) => engine.moveRow(taskId, toIndex),
    taskField: (t: GanttTask, field: Parameters<GanttEngine['taskField']>[1]) => engine.taskField(t, field),
    onCommit: (fn: (p: TaskChangePayload) => void) => engine.onCommit(fn as any),
    onReschedule: (fn: (changes: any[]) => void) => engine.onReschedule(fn),
    onLinkCreate: (fn: (p: { from: string; to: string }) => void) => engine.onLinkCreate(fn),
    onLinkClick: (fn: (l: GanttLink) => void) => engine.onLinkClick(fn),
    onLinkDblClick: (fn: (l: GanttLink) => void) => engine.onLinkDblClick(fn),
    onLinkDelete: (fn: (l: GanttLink) => void) => engine.onLinkDelete(fn),
    onLinkTypeChange: (fn: (p: { old: GanttLink; new: GanttLink }) => void) => engine.onLinkTypeChange(fn),
    onLinkReconnect: (fn: (p: { old: GanttLink; new: GanttLink; side: 'from' | 'to' }) => void) => engine.onLinkReconnect(fn),
    onExpand: (fn: (t: GanttTask, expanded: boolean) => void) => engine.onExpand(fn),
    onRowMove: (fn: (p: { task: GanttTask; fromIndex: number; toIndex: number; parentId: string | null }) => void) =>
      engine.onRowMove(fn),
    emitLinkClick: (l: GanttLink) => engine.emitLinkClick(l as any),
    emitLinkDblClick: (l: GanttLink) => engine.emitLinkDblClick(l as any),
    /** 删除连线 */
    removeLink: (l: GanttLink) => {
      engine.removeLink(l)
      const links = engine.options.peek().links
      if (opts.links && links) opts.links.value = links
    },
    /** 修改连线类型 */
    changeLinkType: (l: GanttLink, type: any) => {
      engine.changeLinkType(l, type)
      const links = engine.options.peek().links
      if (opts.links && links) opts.links.value = links
    },
    /** 重连连线端点 */
    reconnectLink: (l: GanttLink, side: 'from' | 'to', newTaskId: string) => {
      engine.reconnectLink(l, side, newTaskId)
      const links = engine.options.peek().links
      if (opts.links && links) opts.links.value = links
    },
    /** 触发右键菜单 */
    triggerContextMenu: (task: GanttTask, e: MouseEvent) => {
      opts.onContextMenu.value?.(task, e)
    },
    onContextMenu: opts.onContextMenu,
    /** 获取可见时间范围 */
    visibleRange
  }
}

/** 把引擎的 Signal 代理为可读写的 Vue customRef（选中 / 悬浮） */
function bindSignalRef<K extends 'selectedId' | 'hoverId'>(engine: GanttEngine, key: K): Ref<string | null> {
  let trigger = () => {}
  const r = customRef<string | null>((track, trig) => {
    trigger = trig
    return {
      get() {
        track()
        return engine[key].peek()
      },
      set(v: string | null) {
        engine[key].value = v
        trigger()
      }
    }
  })
  engine[key].subscribe(() => trigger())
  return r
}

export type GanttStore = ReturnType<typeof createGanttStore>
export const GANTT_KEY: InjectionKey<GanttStore> = Symbol('gantt')
