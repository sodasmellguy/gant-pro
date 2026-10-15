/**
 * GanttSyncHub：多图联动控制器
 * 同步多个 GanttChart 实例的 scroll / scale / selection / expand
 */
import { ref } from 'vue'
import type { GanttSyncConfig, ScaleType } from '@gantt-pro/core'

export interface GanttSyncInstance {
  /** 设置滚动位置（scrollLeft） */
  setScrollLeft: (v: number) => void
  /** 设置滚动位置（scrollTop） */
  setScrollTop: (v: number) => void
  /** 设置刻度 */
  setScale: (s: ScaleType) => void
  /** 设置选中任务 */
  setSelected: (id: string | null) => void
  /** 获取当前滚动位置 */
  getScrollLeft: () => number
  /** 获取当前滚动顶部 */
  getScrollTop: () => number
}

/**
 * 创建多图联动中心
 *
 * @example
 * ```ts
 * const hub = createGanttSyncHub({ scroll: true, scale: true, selection: true })
 * // 在 GanttChart 组件中注册
 * hub.register(ref, ganttRef1)
 * hub.register(ref, ganttRef2)
 * // 滚动任一实例时，其他实例自动同步
 * ```
 */
export function createGanttSyncHub(config: GanttSyncConfig = {}) {
  const instances = new Map<symbol, GanttSyncInstance>()
  const syncing = ref(false)
  const cfg: Required<GanttSyncConfig> = {
    scroll: config.scroll ?? true,
    scale: config.scale ?? true,
    selection: config.selection ?? false,
    expand: config.expand ?? false
  }

  function register(key: symbol, inst: GanttSyncInstance) {
    instances.set(key, inst)
  }

  function unregister(key: symbol) {
    instances.delete(key)
  }

  /** 广播：从一个实例同步到所有其他实例 */
  function broadcast(
    source: symbol,
    action: 'scroll' | 'scale' | 'selection',
    value: number | string | ScaleType | null
  ) {
    if (syncing.value) return
    syncing.value = true
    for (const [key, inst] of instances) {
      if (key === source) continue
      if (action === 'scroll' && cfg.scroll) {
        if (typeof value === 'number') {
          inst.setScrollLeft(value)
        }
      } else if (action === 'scale' && cfg.scale) {
        if (typeof value === 'string') {
          inst.setScale(value as ScaleType)
        }
      } else if (action === 'selection' && cfg.selection) {
        inst.setSelected(value as string | null)
      }
    }
    // 微任务后解除锁，避免递归
    Promise.resolve().then(() => {
      syncing.value = false
    })
  }

  /** 当某实例滚动时调用 */
  function onScroll(source: symbol, scrollLeft: number) {
    broadcast(source, 'scroll', scrollLeft)
  }

  /** 当某实例刻度变化时调用 */
  function onScaleChange(source: symbol, scale: ScaleType) {
    broadcast(source, 'scale', scale)
  }

  /** 当某实例选择变化时调用 */
  function onSelectionChange(source: symbol, id: string | null) {
    broadcast(source, 'selection', id)
  }

  return {
    config: cfg,
    register,
    unregister,
    onScroll,
    onScaleChange,
    onSelectionChange,
    syncing
  }
}

export type GanttSyncHub = ReturnType<typeof createGanttSyncHub>
