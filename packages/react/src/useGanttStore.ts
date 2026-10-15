/**
 * useGanttStore — React Hook 桥接 GanttEngine
 *
 * 创建 GanttEngine 实例，订阅变更触发重渲染，桥接回调。
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { GanttEngine, type EngineOptions, type GanttTask, type TaskChangePayload, type GanttLink, type RescheduleChange } from '@gantt-pro/core'
import type { GanttChartCallbacks } from './types'

export function useGanttStore(
  data: GanttTask[],
  options: EngineOptions,
  callbacks: GanttChartCallbacks = {}
): GanttEngine {
  // 创建引擎实例（只创建一次）
  const engineRef = useRef<GanttEngine | null>(null)
  if (!engineRef.current) {
    engineRef.current = new GanttEngine(data, options)
  }
  const engine = engineRef.current

  // 用 useState 触发重渲染
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  // 订阅 engine 变更
  useEffect(() => {
    // 订阅 dragVersion 和 linkDraftVersion 变更触发重渲染
    const unsubDrag = engine.dragVersion.subscribe(forceUpdate)
    const unsubLink = engine.linkDraftVersion.subscribe(forceUpdate)
    return () => { unsubDrag(); unsubLink() }
  }, [engine, forceUpdate])

  // data 外部变更同步
  useEffect(() => {
    if (data !== engine.data.value) {
      engine.setData(data)
      forceUpdate()
    }
  }, [data, engine, forceUpdate])

  // options 变更同步
  const optsKey = JSON.stringify(options)
  useEffect(() => {
    engine.updateOptions(options)
    forceUpdate()
  }, [optsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 注册回调
  useEffect(() => {
    const unsubs: (() => void)[] = []
    if (callbacks.onTaskChange) {
      unsubs.push(engine.onCommit(callbacks.onTaskChange))
    }
    if (callbacks.onLinkCreate) {
      unsubs.push(engine.onLinkCreate(callbacks.onLinkCreate))
    }
    if (callbacks.onLinkClick) {
      unsubs.push(engine.onLinkClick(callbacks.onLinkClick))
    }
    if (callbacks.onLinkDblClick) {
      unsubs.push(engine.onLinkDblClick(callbacks.onLinkDblClick))
    }
    if (callbacks.onLinkDelete) {
      unsubs.push(engine.onLinkDelete(callbacks.onLinkDelete))
    }
    if (callbacks.onLinkTypeChange) {
      unsubs.push(engine.onLinkTypeChange((p) => callbacks.onLinkTypeChange!(p.new, p.new.type!)))
    }
    if (callbacks.onLinkReconnect) {
      unsubs.push(engine.onLinkReconnect((p) => callbacks.onLinkReconnect!(p.old, p.side, p.side === 'from' ? p.new.from : p.new.to)))
    }
    if (callbacks.onExpand) {
      unsubs.push(engine.onExpand(callbacks.onExpand))
    }
    if (callbacks.onReschedule) {
      unsubs.push(engine.onReschedule(callbacks.onReschedule))
    }
    if (callbacks.onRowMove) {
      unsubs.push(engine.onRowMove(callbacks.onRowMove))
    }
    return () => unsubs.forEach(fn => fn())
  }, [
    callbacks.onTaskChange, callbacks.onLinkCreate, callbacks.onLinkClick,
    callbacks.onLinkDblClick, callbacks.onLinkDelete, callbacks.onLinkTypeChange,
    callbacks.onLinkReconnect, callbacks.onExpand, callbacks.onReschedule,
    callbacks.onRowMove, engine
  ])

  // 销毁
  useEffect(() => {
    return () => engine.destroy()
  }, [engine])

  return engine
}
