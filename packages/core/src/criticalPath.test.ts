/**
 * criticalPath.ts — CPM 关键路径算法测试
 */
import { describe, it, expect } from 'vitest'
import { computeCriticalIds, type DatesOfFn, type WalkFn } from './criticalPath'
import type { GanttTask, GanttLink } from './types'
import { toDate, startOfDay } from './date'

const datesOf: DatesOfFn = (t: GanttTask) => {
  const s = t.startDate ? startOfDay(toDate(t.startDate)) : null
  const e = t.endDate ? startOfDay(toDate(t.endDate)) : (s ? new Date(s) : null)
  return { start: s, end: e }
}

const walk: WalkFn = (list, fn) => {
  const rec = (arr: GanttTask[]) => {
    for (const t of arr) {
      fn(t)
      if (t.children?.length) rec(t.children)
    }
  }
  rec(list)
}

function flat(tasks: GanttTask[]): GanttTask[] {
  const out: GanttTask[] = []
  walk(tasks, t => out.push({ ...t }))
  return out.map(t => { delete (t as any).children; return t })
}

describe('computeCriticalIds', () => {
  it('should return empty set when no links', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }
    ]
    expect(computeCriticalIds(tasks, [], datesOf, walk).size).toBe(0)
  })

  it('should return empty set on cyclic links', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
    ]
    const links: GanttLink[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' }
    ]
    expect(computeCriticalIds(tasks, links, datesOf, walk).size).toBe(0)
  })

  it('should ignore self links', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }
    ]
    expect(computeCriticalIds(tasks, [{ from: 'a', to: 'a' }], datesOf, walk).size).toBe(0)
  })

  it('should mark whole zero-float chain as critical', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' },
      { id: 'c', name: 'c', startDate: '2025-01-11', endDate: '2025-01-15' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
    const crit = computeCriticalIds(tasks, links, datesOf, walk)
    expect(crit.size).toBe(3)
    expect(crit.has('a')).toBe(true)
    expect(crit.has('b')).toBe(true)
    expect(crit.has('c')).toBe(true)
  })

  it('should exclude tasks with float', () => {
    // a→b→c 链条中 b 有大量空浮时（a 早完成、c 晚开始）
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-02' },
      { id: 'b', name: 'b', startDate: '2025-01-10', endDate: '2025-01-12' },
      { id: 'c', name: 'c', startDate: '2025-01-20', endDate: '2025-01-21' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
    const crit = computeCriticalIds(tasks, links, datesOf, walk)
    expect(crit.has('c')).toBe(true) // 项目末端任务必然关键
    expect(crit.has('a')).toBe(false)
    expect(crit.has('b')).toBe(false)
  })

  it('should not be affected by unlinked tail tasks with later end', () => {
    // 无依赖任务 d 拉长项目工期，链条 a→b 全部出现浮时
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-02' },
      { id: 'b', name: 'b', startDate: '2025-01-03', endDate: '2025-01-04' },
      { id: 'd', name: 'd', startDate: '2025-03-01', endDate: '2025-03-31' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }]
    const crit = computeCriticalIds(tasks, links, datesOf, walk)
    expect(crit.size).toBe(0)
  })

  it('should skip links referencing missing tasks', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }, { from: 'a', to: 'ghost' }]
    const crit = computeCriticalIds(tasks, links, datesOf, walk)
    expect(crit.size).toBe(2)
  })

  it('should work with milestone tasks (end = start)', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'm', name: 'm', startDate: '2025-01-06', milestone: true }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'm' }]
    const crit = computeCriticalIds(tasks, links, datesOf, walk)
    // 里程碑作为项目终点应为关键任务
    expect(crit.has('m')).toBe(true)
  })

  it('should traverse nested trees via walk', () => {
    const tasks: GanttTask[] = [
      {
        id: 'p', name: 'p',
        children: [
          { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
          { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
        ]
      }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }]
    const crit = computeCriticalIds(flat(tasks), links, datesOf, walk)
    expect(crit.size).toBe(2)
  })

  it('ff links should constrain finish-to-finish', () => {
    // a (01-01~01-05) ff→ b (01-03~01-08)：b 的完成不得早于 a 的完成，
    // b 已晚于 a 完成 → a 有浮时
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-03', endDate: '2025-01-08' }
    ]
    const crit = computeCriticalIds(tasks, [{ from: 'a', to: 'b', type: 'ff' }], datesOf, walk)
    expect(crit.has('b')).toBe(true)
    expect(crit.has('a')).toBe(false)
  })
})
