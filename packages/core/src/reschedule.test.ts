/**
 * reschedule.ts — 依赖顺推算法测试
 */
import { describe, it, expect, vi } from 'vitest'
import { rescheduleFrom, shiftTask } from './reschedule'
import type { DatesOfFn, WalkFn } from './criticalPath'
import type { GanttTask, GanttLink } from './types'
import { toDate, startOfDay } from './date'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

function makeDatesOf(isHour = false): DatesOfFn {
  return (t: GanttTask) => {
    const s = t.startDate ? startOfDay(toDate(t.startDate)) : null
    const e = t.endDate ? startOfDay(toDate(t.endDate)) : (s ? new Date(s) : null)
    return { start: s, end: e }
  }
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

describe('rescheduleFrom', () => {
  it('should return empty when no links', () => {
    const tasks: GanttTask[] = [{ id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }]
    expect(rescheduleFrom('a', tasks, [], makeDatesOf(), walk, false)).toEqual([])
  })

  it('should return empty on cyclic dependencies', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]
    expect(rescheduleFrom('a', tasks, links, makeDatesOf(), walk, false)).toEqual([])
  })

  it('fs: should push successor when predecessor moves later', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b', type: 'fs' }]
    // a 顺延 2 天 → 01-03~01-07，b (01-06) 违反 fs 约束需顺延到 01-08
    tasks[0].startDate = '2025-01-03'
    tasks[0].endDate = '2025-01-07'
    const changes = rescheduleFrom('a', tasks, links, makeDatesOf(), walk, false)
    expect(changes).toHaveLength(1)
    expect(changes[0].task.id).toBe('b')
    expect(tasks[1].startDate).toBe('2025-01-08')
  })

  it('fs: satisfied constraints should not move anything', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b', type: 'fs' }]
    expect(rescheduleFrom('a', tasks, links, makeDatesOf(), walk, false)).toEqual([])
  })

  it('should propagate through the chain iteratively', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' },
      { id: 'c', name: 'c', startDate: '2025-01-11', endDate: '2025-01-15' }
    ]
    const links: GanttLink[] = [
      { from: 'a', to: 'b', type: 'fs' },
      { from: 'b', to: 'c', type: 'fs' }
    ]
    // 模拟 a 顺延 2 天：01-03 ~ 01-07
    const a = tasks[0]
    a.startDate = '2025-01-03'
    a.endDate = '2025-01-07'
    const changes = rescheduleFrom('a', tasks, links, makeDatesOf(), walk, false)
    const ids = changes.map(c => c.task.id).sort()
    expect(ids).toEqual(['b', 'c'])
    expect(tasks[1].startDate).toBe('2025-01-08') // b: 01-08~01-12
    expect(tasks[2].startDate).toBe('2025-01-13') // c: 01-13~01-17
    // 变更记录应包含原日期
    const bChange = changes.find(c => c.task.id === 'b')!
    expect(bChange.oldStartDate).toBe('2025-01-06')
    expect(bChange.oldEndDate).toBe('2025-01-10')
  })

  it('should only touch reachable successors', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 'b', name: 'b', startDate: '2025-01-20', endDate: '2025-01-22' },
      { id: 'x', name: 'x', startDate: '2025-02-01', endDate: '2025-02-02' }
    ]
    const links: GanttLink[] = [{ from: 'a', to: 'b' }, { from: 'a', to: 'x' }]
    // b 约束满足（01-20 > 01-06），x 也满足 → 无变更
    const changes = rescheduleFrom('a', tasks, links, makeDatesOf(), walk, false)
    expect(changes).toEqual([])
  })

  it('sf: successor end must not start before predecessor start', () => {
    const tasks: GanttTask[] = [
      { id: 'a', name: 'a', startDate: '2025-01-05', endDate: '2025-01-08' },
      { id: 'b', name: 'b', startDate: '2025-01-01', endDate: '2025-01-03' }
    ]
    // sf: b 的完成需要 >= a 的开始；b 完成 01-03 < a 开始 01-05 → b 顺延 2 天
    const changes = rescheduleFrom('a', tasks, [{ from: 'a', to: 'b', type: 'sf' }], makeDatesOf(), walk, false)
    expect(changes).toHaveLength(1)
    expect(tasks[1].endDate).toBe('2025-01-05')
  })

  it('shiftTask on summary should transfer to leaves', () => {
    const parent: GanttTask = {
      id: 'p', name: 'p', startDate: '2025-01-01', endDate: '2025-01-05',
      children: [
        { id: 'c1', name: 'c1', startDate: '2025-01-01', endDate: '2025-01-03' },
        { id: 'c2', name: 'c2', startDate: '2025-01-03', endDate: '2025-01-05' }
      ]
    }
    const changed = new Map()
    shiftTask(parent, 2, changed as any, false)
    expect(parent.children![0].startDate).toBe('2025-01-03')
    expect(parent.children![1].endDate).toBe('2025-01-07')
    // 汇总自身日期不变（转嫁给叶子）
    expect(parent.startDate).toBe('2025-01-01')
    // 叶子各自记录原始日期
    expect((changed as Map<string, any>).size).toBe(2)
  })

  it('shiftTask should keep first-recorded original dates', () => {
    const t: GanttTask = { id: 'a', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }
    const changed = new Map<string, any>()
    shiftTask(t, 2, changed, false)
    shiftTask(t, 3, changed)
    expect(t.startDate).toBe('2025-01-06')
    expect(changed.get('a').oldStartDate).toBe('2025-01-01') // 只记录第一次
  })

  it('shiftTask should not add endDate to milestone', () => {
    const m: GanttTask = { id: 'm', name: 'm', startDate: '2025-01-10', milestone: true }
    const changed = new Map()
    shiftTask(m, 3, changed as any, false)
    expect(m.startDate).toBe('2025-01-13')
    expect(m.endDate).toBeUndefined()
  })

  it('hour mode should format with time part', () => {
    const t: GanttTask = { id: 'a', name: 'a', startDate: '2025-01-01T08:00', endDate: '2025-01-01T12:00' }
    const changed = new Map()
    shiftTask(t, 1, changed as any, true) // isHour: days 参数实际加到 startDate
    // addDays(startOfDay+8h, 1) → 次日 08:00
    expect(String(t.startDate)).toMatch(/T08:00$/)
  })

  it('should handle summary nodes in taskMap (datesOf from tree)', () => {
    const tasks: GanttTask[] = [
      {
        id: 'p', name: 'p', startDate: '2025-01-01', endDate: '2025-01-05',
        children: [{ id: 'c1', name: 'c1', startDate: '2025-01-01', endDate: '2025-01-05' }]
      },
      { id: 'b', name: 'b', startDate: '2025-01-20', endDate: '2025-01-22' }
    ]
    const links: GanttLink[] = [{ from: 'p', to: 'b', type: 'fs' }]
    const changes = rescheduleFrom('p', tasks, links, makeDatesOf(), walk, false)
    expect(changes).toEqual([]) // b (01-20) 已满足约束
  })
})
