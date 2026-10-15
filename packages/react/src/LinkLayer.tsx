/**
 * LinkLayer — React 依赖连线组件
 *
 * 增强功能：
 * - 双击/右键弹出操作菜单（删除连线、修改类型）
 * - 拖拽端点圆圈重连连线
 */
import { useCallback, useState, useEffect, useRef, type ReactNode } from 'react'
import { useGanttEngine } from './context'
import type { GanttLink, LinkType, ScaleType } from '@gantt-pro/core'

interface LinkLayerProps {
  /** 双击连线删除（回调给 GanttChart 统一处理 links 状态） */
  onLinkDelete?: (l: GanttLink) => void
  onLinkTypeChange?: (l: GanttLink, type: LinkType) => void
  onLinkReconnect?: (l: GanttLink, side: 'from' | 'to', newTaskId: string) => void
  /** 当前刻度（保留兼容，实际通过 engine 重渲染驱动） */
  scale?: ScaleType
  children?: ReactNode
}

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: 'fs', label: '完成→开始 (FS)' },
  { value: 'ss', label: '开始→开始 (SS)' },
  { value: 'ff', label: '完成→完成 (FF)' },
  { value: 'sf', label: '开始→完成 (SF)' },
]

/** 从 path d 字符串中提取起点坐标 */
function pathStart(d: string): { x: number; y: number } {
  const m = d.match(/M\s*([-\d.]+)\s+([-\d.]+)/)
  return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 }
}
/** 从 path d 字符串中提取终点坐标 */
function pathEnd(d: string): { x: number; y: number } {
  const nums = d.match(/[-\d.]+/g)?.map(Number) ?? [0, 0]
  return { x: nums[nums.length - 2] ?? 0, y: nums[nums.length - 1] ?? 0 }
}

export function LinkLayer({
  onLinkDelete,
  onLinkTypeChange,
  onLinkReconnect,
}: LinkLayerProps) {
  const engine = useGanttEngine()
  const _dragVersion = engine.dragVersion.value // 触发响应式依赖追踪
  const paths = engine.linkPaths
  const draft = engine.linkDraftLine

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; link: GanttLink } | null>(null)
  const dragReconnectRef = useRef<{ link: GanttLink; side: 'from' | 'to' } | null>(null)
  const [, forceRerender] = useState(0)

  // 全局点击关闭菜单
  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ctxMenu])

  const onDblClick = useCallback(
    (link: GanttLink) => (e: React.MouseEvent) => {
      e.stopPropagation()
      setCtxMenu({ x: e.clientX, y: e.clientY, link })
    },
    []
  )

  const onContextMenu = useCallback(
    (link: GanttLink) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setCtxMenu({ x: e.clientX, y: e.clientY, link })
    },
    []
  )

  const handleDelete = useCallback(() => {
    if (!ctxMenu) return
    if (onLinkDelete) {
      onLinkDelete(ctxMenu.link)
    } else {
      engine.removeLink(ctxMenu.link)
    }
    setCtxMenu(null)
  }, [ctxMenu, onLinkDelete, engine])

  const handleTypeChange = useCallback(
    (type: LinkType) => {
      if (!ctxMenu) return
      if (onLinkTypeChange) {
        onLinkTypeChange(ctxMenu.link, type)
      } else {
        engine.changeLinkType(ctxMenu.link, type)
      }
      setCtxMenu(null)
    },
    [ctxMenu, onLinkTypeChange, engine]
  )

  const onEndpointPointerDown = useCallback(
    (e: React.PointerEvent, link: GanttLink, side: 'from' | 'to') => {
      e.stopPropagation()
      e.preventDefault()
      dragReconnectRef.current = { link, side }
      forceRerender((n) => n + 1)

      const move = () => {
        forceRerender((n) => n + 1)
      }
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        const dragInfo = dragReconnectRef.current
        dragReconnectRef.current = null
        forceRerender((n) => n + 1)
        if (!dragInfo) return
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
        const bar = el?.closest('[data-task-id]') as HTMLElement | null
        const newId = bar?.dataset.taskId
        if (newId && newId !== dragInfo.link.from && newId !== dragInfo.link.to) {
          if (onLinkReconnect) {
            onLinkReconnect(dragInfo.link, dragInfo.side, newId)
          } else {
            engine.reconnectLink(dragInfo.link, dragInfo.side, newId)
          }
        }
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [onLinkReconnect, engine]
  )

  return (
    <>
      <svg className="gt-link-layer">
        <defs>
          <marker id="gt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" className="gt-arrow-head" />
          </marker>
          <marker id="gt-arrow-dashed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" className="gt-arrow-head" />
          </marker>
        </defs>
        {paths.map((p) => {
          const isDashed = p.link.type === 'ff' || p.link.type === 'sf'
          const start = pathStart(p.d)
          const end = pathEnd(p.d)
          return (
            <g key={p.key}>
              {/* 命中区域 */}
              <path
                className="gt-link-hit"
                d={p.d}
                onClick={(e) => {
                  e.stopPropagation()
                  engine.emitLinkClick(p.link)
                }}
                onDoubleClick={onDblClick(p.link)}
                onContextMenu={onContextMenu(p.link)}
              />
              {/* 可见线 */}
              <path
                className={`gt-link-line ${p.critical ? 'critical' : ''} ${isDashed ? 'dashed' : ''}`}
                d={p.d}
                style={{ stroke: p.color }}
                markerEnd={isDashed ? 'url(#gt-arrow-dashed)' : 'url(#gt-arrow)'}
              />
              {/* 起点端点 */}
              <circle
                className="gt-link-endpoint"
                cx={start.x}
                cy={start.y}
                r={5}
                onPointerDown={(e) => onEndpointPointerDown(e, p.link, 'from')}
              />
              {/* 终点端点 */}
              <circle
                className="gt-link-endpoint"
                cx={end.x}
                cy={end.y}
                r={5}
                onPointerDown={(e) => onEndpointPointerDown(e, p.link, 'to')}
              />
            </g>
          )
        })}
        {draft && (
          <path
            className="gt-link-line draft"
            d={`M ${draft.x1} ${draft.y1} L ${draft.x2} ${draft.y2}`}
          />
        )}
      </svg>

      {/* 连线右键/双击菜单 */}
      {ctxMenu && (
        <div
          className="gt-link-ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gt-link-ctx-title">连线操作</div>
          <button className="gt-link-ctx-item danger" onClick={handleDelete}>
            🗑 删除连线
          </button>
          <div className="gt-link-ctx-divider" />
          <div className="gt-link-ctx-label">修改类型</div>
          {LINK_TYPES.map((t) => (
            <button
              key={t.value}
              className={`gt-link-ctx-item ${(ctxMenu.link.type ?? 'fs') === t.value ? 'active' : ''}`}
              onClick={() => handleTypeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
