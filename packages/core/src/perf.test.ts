import { describe, it, expect } from 'vitest'
import { GanttEngine } from './ganttEngine'
import type { GanttTask } from './types'

/** 生成 N 个任务的测试数据 */
function generateTasks(n: number): GanttTask[] {
  const tasks: GanttTask[] = []
  const groups = 10
  const perGroup = Math.ceil(n / groups)
  for (let g = 0; g < groups; g++) {
    const children: GanttTask[] = []
    for (let i = 0; i < perGroup; i++) {
      const idx = g * perGroup + i
      if (idx >= n) break
      const start = new Date(2025, 0, 1 + idx)
      const end = new Date(2025, 0, 5 + idx)
      children.push({
        id: `t${idx}`,
        name: `任务 ${idx}`,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        progress: (idx * 7) % 100
      })
    }
    tasks.push({
      id: `g${g}`,
      name: `分组 ${g}`,
      children,
      startDate: children[0]?.startDate,
      endDate: children[children.length - 1]?.endDate
    })
  }
  return tasks
}

describe('性能测试', () => {
  it('100 个任务 flatRows 计算应在 10ms 内完成', () => {
    const data = generateTasks(100)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    const start = performance.now()
    const rows = engine.flatRows
    const elapsed = performance.now() - start
    expect(rows.length).toBeGreaterThan(100)
    expect(elapsed).toBeLessThan(10)
  })

  it('100 个任务 geoms 计算应在 50ms 内完成', () => {
    const data = generateTasks(100)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    const start = performance.now()
    const geoms = engine.geoms
    const elapsed = performance.now() - start
    expect(geoms.size).toBeGreaterThan(100)
    expect(elapsed).toBeLessThan(50)
  })

  it('flatRows 缓存命中时第二次访问应在 0.1ms 内完成', () => {
    const data = generateTasks(500)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    engine.flatRows
    const start = performance.now()
    engine.flatRows
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(0.1)
  })

  it('geoms 缓存命中时第二次访问应在 0.1ms 内完成', () => {
    const data = generateTasks(500)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    engine.geoms
    const start = performance.now()
    engine.geoms
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(0.1)
  })

  it('criticalIds 缓存命中时第二次访问应在 0.1ms 内完成', () => {
    const data = generateTasks(500)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24, showCriticalPath: true, links: [] })
    engine.criticalIds
    const start = performance.now()
    engine.criticalIds
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(0.1)
  })

  it('缓存失效后重新计算应产生正确结果', () => {
    const data = generateTasks(50)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    const rows1 = engine.flatRows
    const count1 = rows1.length
    engine.setData(generateTasks(100))
    const rows2 = engine.flatRows
    expect(rows2.length).toBeGreaterThan(count1)
  })

  it('options 变更后缓存应失效', () => {
    const data = generateTasks(50)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    const rows1 = engine.flatRows
    engine.updateOptions({ rowHeight: 48 })
    const rows2 = engine.flatRows
    // 缓存应失效，重新计算
    expect(rows2).not.toBe(rows1)
    // 行数应该一样但行高不同时 geoms 的 y 坐标会不同
    const geoms1 = engine.geoms
    // 再次 updateOptions 让 geoms 缓存也失效
    engine.updateOptions({ rowHeight: 60 })
    const geoms2 = engine.geoms
    expect(geoms2).not.toBe(geoms1)
  })

  it('1000 个任务缓存命中场景：首次计算后连续 10 次读取应在 5ms 内', () => {
    const data = generateTasks(1000)
    const engine = new GanttEngine(data, { scale: 'day', rowHeight: 36, barHeight: 24 })
    engine.flatRows
    engine.geoms
    const start = performance.now()
    for (let i = 0; i < 10; i++) {
      engine.flatRows
      engine.geoms
    }
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(5)
  })
})
