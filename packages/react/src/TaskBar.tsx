/**
 * TaskBar — React 任务条组件
 *
 * DOM 结构与 Vue 版 TaskBar.vue 一致（.gt-bar-wrap > .gt-bar/.gt-summary/.gt-milestone），
 * 复用 gantt.css 的任务条样式。
 */
import { memo, useCallback, useState } from 'react'
import { useGanttEngine } from './context'
import type { Geom } from '@gantt-pro/core'

interface TaskBarProps {
  geom: Geom
  alignment?: 'left' | 'center' | 'right'
  progressColor?: string
  showSlot?: boolean
  /** 右键菜单（冒泡给 GanttChart 处理） */
  onTaskContextMenu?: (task: Geom['task'], e: MouseEvent) => void
  children?: React.ReactNode
}

export const TaskBar = memo(function TaskBar({
  geom, alignment = 'center', progressColor, showSlot = false, onTaskContextMenu, children
}: TaskBarProps) {
  const engine = useGanttEngine()
  const task = geom.task
  const progress = geom.summary ? engine.summaryProgress(task) : (task.progress ?? 0)
  const rowHeight = engine.options.value.rowHeight
  const allowLink = engine.options.value.allowLink
  const selected = engine.selectedId.value === task.id
  const [hovered, setHovered] = useState(false)

  const showLabel = !geom.milestone && geom.w > 46
  const labelOutside = geom.w < 120 && !geom.summary

  const onDown = useCallback((e: React.PointerEvent, mode: 'move' | 'left' | 'right') => {
    engine.selectedId.value = task.id
    engine.startDrag(e.nativeEvent, task, mode)
  }, [engine, task])

  const onProgressDown = useCallback((e: React.PointerEvent) => {
    engine.startDrag(e.nativeEvent, task, 'progress')
  }, [engine, task])

  const onAnchorDown = useCallback((e: React.PointerEvent) => {
    engine.startLinkDraft(e.nativeEvent, task)
  }, [engine, task])

  const onClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    engine.selectedId.value = task.id
  }, [engine, task])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    engine.selectedId.value = task.id
    onTaskContextMenu?.(task, e.nativeEvent)
  }, [engine, task, onTaskContextMenu])

  const wrapperStyle: React.CSSProperties = {
    left: geom.x + 'px',
    top: geom.y + 'px',
    width: Math.max(geom.w, 2) + 'px',
    height: rowHeight + 'px'
  }

  // 条形定位样式（对齐 Vue 版 barStyle）
  const barStyle: React.CSSProperties = geom.milestone
    ? {}
    : {
        width: Math.max(geom.w, 2) + 'px',
        height: geom.h + 'px',
        left: alignment === 'left' ? '0px' : alignment === 'right' ? 'auto' : '0px',
        right: alignment === 'right' ? '0px' : undefined,
        top: '50%',
        transform: alignment === 'center' ? 'translateY(-50%)' : undefined,
        marginTop: alignment !== 'center' ? `calc(-${geom.h / 2}px)` : undefined,
        background: task.color
          ? `linear-gradient(180deg, ${task.color}, ${task.color})`
          : undefined
      }

  return (
    <div
      className="gt-bar-wrap"
      style={wrapperStyle}
      data-task-id={task.id}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
    >
      {/* 基准线（计划）：普通任务/汇总行为灰条，里程碑为空心菱形 */}
      {geom.baseline && !geom.milestone && (
        <div
          className={`gt-baseline ${geom.overdue ? 'overdue' : ''}`}
          style={{ left: (geom.bx - geom.x) + 'px', width: geom.bw + 'px' }}
        />
      )}
      {geom.baseline && geom.milestone && (
        <div
          className={`gt-baseline-dia ${geom.overdue ? 'overdue' : ''}`}
          style={{ left: (geom.bx - geom.x) + 'px' }}
        />
      )}
      {/* 里程碑 */}
      {geom.milestone ? (
        (() => {
          const size = Math.min(geom.h + 10, 22)
          return (
            <div
              className={`gt-milestone ${selected ? 'selected' : ''} ${geom.critical ? 'critical' : ''}`}
              style={{
                width: size + 'px',
                height: size + 'px',
                left: `calc(50% - ${size / 2}px)`,
                top: `calc(50% - ${size / 2}px)`,
                color: task.color || undefined
              }}
              onPointerDown={(e) => onDown(e, 'move')}
              onClick={onClick}
            />
          )
        })()
      ) : geom.summary ? (
        /* 汇总条 */
        <div
          className={`gt-summary ${selected ? 'selected' : ''}`}
          style={{ width: Math.max(geom.w, 2) + 'px', height: geom.h + 'px' }}
          onClick={onClick}
        >
          <span className="gt-summary-cap left" />
          <div className="gt-summary-track">
            <div className="gt-summary-fill" style={{ width: progress + '%' }} />
          </div>
          <span className="gt-summary-cap right" />
        </div>
      ) : (
        /* 普通任务条 */
        <div
          className={`gt-bar ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''} ${geom.critical ? 'critical' : ''}`}
          style={barStyle}
          onPointerDown={(e) => onDown(e, 'move')}
          onClick={onClick}
        >
          {showSlot && children}
          {!showSlot && <div className="gt-bar-fill" style={{ width: progress + '%', background: progressColor || undefined }} />}
          {/* 预期进度标记线 */}
          {geom.expectedX != null && (
            <div className="gt-expected-line" style={{ left: (geom.expectedX - geom.x) + 'px' }} />
          )}
          {/* 分段渲染 */}
          {geom.segments?.map((seg, si) => (
            <div
              key={'seg' + si}
              className="gt-segment"
              style={{ left: (seg.x - geom.x) + 'px', width: seg.w + 'px', background: seg.color || undefined }}
            >
              {seg.progress != null && (
                <div className="gt-segment-fill" style={{ width: seg.progress + '%' }} />
              )}
            </div>
          ))}
          {showLabel && (
            <span className={`gt-bar-label ${labelOutside ? 'outside' : ''}`}>{task.name}</span>
          )}
          {!labelOutside && progress > 0 && progress < 100 && (
            <div className="gt-progress-divider" style={{ left: progress + '%' }} />
          )}
          <span className="gt-handle left" onPointerDown={(e) => { e.stopPropagation(); onDown(e, 'left') }} />
          <span className="gt-handle right" onPointerDown={(e) => { e.stopPropagation(); onDown(e, 'right') }} />
          {progress > 0 && progress < 100 && (
            <span
              className="gt-progress-thumb"
              style={{ left: `calc(${progress}% - 5px)` }}
              onPointerDown={(e) => { e.stopPropagation(); onProgressDown(e) }}
            />
          )}
        </div>
      )}
      {/* 负责人小标签（条形右端外侧） */}
      {(() => {
        if (geom.summary || geom.milestone || labelOutside) return null
        const o = task.owner
        if (o == null) return null
        const name = typeof o === 'string' ? o : o.name
        const color = typeof o === 'object' && o ? o.color : undefined
        return <span className="gt-owner-tag" style={color ? { background: color } : undefined}>{name}</span>
      })()}
      {/* 连线锚点 */}
      {hovered && allowLink && (
        <span
          className="gt-anchor"
          style={geom.milestone
            ? { left: `calc(50% + ${Math.min(geom.h + 10, 22) / 2}px)`, top: '50%' }
            : { right: '-12px', top: '50%' }}
          onPointerDown={(e) => { e.stopPropagation(); onAnchorDown(e) }}
          title="拖拽到另一任务以创建依赖"
        />
      )}
    </div>
  )
})
