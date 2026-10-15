/**
 * 依赖顺推算法（纯函数，框架无关）
 *
 * 从触发任务出发按依赖链顺推：fs/ss/ff/sf 约束下只顺延不提前，
 * 多条前驱取满足全部约束的最大平移量（迭代传播至稳定）。
 * 检测到环则跳过并警告。
 */

import type { GanttLink, GanttTask } from './types'
import type { RescheduleChange } from './ganttEngine'
import { addDays, diffDays, fmt, startOfDay, toDate, toDateWithTime } from './date'

export interface DatesOfFn {
  (t: GanttTask): { start: Date | null; end: Date | null }
}

export interface WalkFn {
  (list: GanttTask[], fn: (t: GanttTask) => void): void
}

/**
 * 整体平移任务（汇总任务转嫁到叶子，父条极值自动跟随）
 * 同一任务多次平移只记录一次原始日期
 */
export function shiftTask(
  t: GanttTask,
  days: number,
  changed: Map<string, RescheduleChange>,
  isHour: boolean
): void {
  if (t.children?.length) {
    for (const c of t.children) shiftTask(c, days, changed, isHour)
    return
  }
  if (!t.startDate) return
  const parse = isHour ? toDateWithTime : (v: string | Date) => startOfDay(toDate(v))
  const fmtDate = (d: Date) => isHour ? fmt(d, 'YYYY-MM-DDTHH:mm') : fmt(d)
  if (!changed.has(t.id)) {
    changed.set(t.id, {
      task: t,
      oldStartDate: fmtDate(parse(t.startDate)),
      oldEndDate: t.endDate ? fmtDate(parse(t.endDate)) : undefined
    })
  }
  t.startDate = fmtDate(addDays(parse(t.startDate), days))
  if (!t.milestone && t.endDate) t.endDate = fmtDate(addDays(parse(t.endDate), days))
}

/**
 * 从触发任务出发按依赖链顺推
 *
 * @param rootId    触发任务 ID
 * @param tasks     任务树根数组
 * @param links     依赖连线数组
 * @param datesOf   日期计算函数（汇总行取子树极值）
 * @param walk      遍历函数
 * @param isHour    是否小时刻度
 * @returns 变更记录数组
 */
export function rescheduleFrom(
  rootId: string,
  tasks: GanttTask[],
  links: GanttLink[],
  datesOf: DatesOfFn,
  walk: WalkFn,
  isHour: boolean
): RescheduleChange[] {
  const all = links.filter(l => l.from !== l.to)
  if (!all.length) return []
  const taskMap = new Map<string, GanttTask>()
  walk(tasks, t => taskMap.set(t.id, t))
  const succ = new Map<string, GanttLink[]>()
  for (const l of all) {
    if (!taskMap.has(l.from) || !taskMap.has(l.to)) continue
    if (!succ.has(l.from)) succ.set(l.from, [])
    succ.get(l.from)!.push(l)
  }
  // 从触发任务出发的可达子图
  const reach = new Set<string>([rootId])
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    for (const l of succ.get(id) ?? []) {
      if (!reach.has(l.to)) { reach.add(l.to); queue.push(l.to) }
    }
  }
  // 环检测（Kahn 拓扑排序）
  const indeg = new Map<string, number>()
  for (const id of reach) indeg.set(id, 0)
  for (const l of all) {
    if (reach.has(l.from) && reach.has(l.to)) indeg.set(l.to, (indeg.get(l.to) ?? 0) + 1)
  }
  const topo = [...reach].filter(id => indeg.get(id) === 0)
  let done = 0
  while (topo.length) {
    const id = topo.shift()!
    done++
    for (const l of succ.get(id) ?? []) {
      if (!reach.has(l.to)) continue
      const d = (indeg.get(l.to) ?? 0) - 1
      indeg.set(l.to, d)
      if (d === 0) topo.push(l.to)
    }
  }
  if (done !== reach.size) {
    console.warn('[gantt-pro/core] 检测到循环依赖，跳过自动顺推')
    return []
  }
  // 迭代传播
  const changed = new Map<string, RescheduleChange>()
  const limit = reach.size + 1
  for (let pass = 0; pass < limit; pass++) {
    let moved = false
    for (const l of all) {
      if (!reach.has(l.from) || !reach.has(l.to)) continue
      const da = datesOf(taskMap.get(l.from)!)
      const db = datesOf(taskMap.get(l.to)!)
      if (!da.start || !db.start) continue
      const type = l.type ?? 'fs'
      let need: Date
      let onEnd = false
      if (type === 'fs') need = addDays(da.end ?? da.start, 1)
      else if (type === 'ss') need = da.start
      else if (type === 'ff') { need = da.end ?? da.start; onEnd = true }
      else { need = da.start; onEnd = true }
      if (onEnd) {
        const cur = db.end ?? db.start
        if (cur < need) { shiftTask(taskMap.get(l.to)!, diffDays(cur, need), changed, isHour); moved = true }
      } else if (db.start < need) {
        shiftTask(taskMap.get(l.to)!, diffDays(db.start, need), changed, isHour)
        moved = true
      }
    }
    if (!moved) break
  }
  return [...changed.values()]
}
