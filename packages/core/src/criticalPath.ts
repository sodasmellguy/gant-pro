/**
 * 关键路径算法（CPM：Critical Path Method）
 *
 * 纯函数实现，框架无关。
 * 计算浮时 <= 0 的叶子任务集合（关键路径上的任务）。
 */

import type { GanttLink, GanttTask } from './types'
import { addDays, diffDays, minDate } from './date'

export interface DatesOfFn {
  (t: GanttTask): { start: Date | null; end: Date | null }
}

export interface WalkFn {
  (list: GanttTask[], fn: (t: GanttTask) => void): void
}

/**
 * 计算关键路径上的任务 ID 集合
 *
 * @param tasks     任务树
 * @param links     依赖连线
 * @param datesOf   日期计算函数（汇总行取子树极值）
 * @param walk       遍历函数
 * @returns 关键任务 ID 集合（空集表示无关键路径或检测到环）
 */
export function computeCriticalIds(
  tasks: GanttTask[],
  links: GanttLink[],
  datesOf: DatesOfFn,
  walk: WalkFn
): Set<string> {
  const res = new Set<string>()
  const filtered = links.filter(l => l.from !== l.to)
  if (!filtered.length) return res
  const taskMap = new Map<string, GanttTask>()
  walk(tasks, t => taskMap.set(t.id, t))
  const allIds = new Set<string>()
  const succOf = new Map<string, GanttLink[]>()
  const indeg = new Map<string, number>()
  for (const l of filtered) {
    if (!taskMap.has(l.from) || !taskMap.has(l.to)) continue
    allIds.add(l.from)
    allIds.add(l.to)
    succOf.set(l.from, [...(succOf.get(l.from) ?? []), l])
  }
  for (const id of allIds) indeg.set(id, 0)
  for (const l of filtered) {
    if (allIds.has(l.from) && allIds.has(l.to)) indeg.set(l.to, (indeg.get(l.to) ?? 0) + 1)
  }
  // 拓扑序（Kahn），有环则放弃
  const order: string[] = []
  const q = [...allIds].filter(id => indeg.get(id) === 0)
  while (q.length) {
    const id = q.shift()!
    order.push(id)
    for (const l of succOf.get(id) ?? []) {
      const d = (indeg.get(l.to) ?? 0) - 1
      indeg.set(l.to, d)
      if (d === 0) q.push(l.to)
    }
  }
  if (order.length !== allIds.size) return res

  // 项目最晚完成时间
  let projectEnd: Date | null = null
  for (const t of taskMap.values()) {
    const d = datesOf(t)
    const e = d.end ?? d.start
    if (e && (!projectEnd || e > projectEnd)) projectEnd = e
  }
  if (!projectEnd) return res

  // 逆拓扑序求 LS/LF
  const LS = new Map<string, Date>()
  const LF = new Map<string, Date>()
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]
    const t = taskMap.get(id)!
    const d = datesOf(t)
    if (!d.start) continue
    const ownEnd = d.end ?? d.start
    const dur = Math.max(0, diffDays(d.start, ownEnd))
    let lf: Date = projectEnd
    let lsCap: Date | null = null
    for (const l of succOf.get(id) ?? []) {
      const type = l.type ?? 'fs'
      const bS = LS.get(l.to)
      const bF = LF.get(l.to)
      if ((type === 'fs' || type === 'ff') && !bS && !bF) continue
      if (type === 'fs' && bS) lf = minDate(lf, addDays(bS, -1))
      else if (type === 'ff' && bF) lf = minDate(lf, bF)
      else if (type === 'ss' && bS) lsCap = lsCap ? minDate(lsCap, bS) : bS
      else if (type === 'sf' && bF) lsCap = lsCap ? minDate(lsCap, bF) : bF
    }
    let ls = addDays(lf, -dur)
    if (lsCap && lsCap < ls) ls = lsCap
    LF.set(id, lf)
    LS.set(id, ls)
  }
  // 正向遍历：ES = 最早开始，EF = 最早完成
  for (const id of order) {
    const t = taskMap.get(id)!
    const d = datesOf(t)
    const ownEnd = d.end ?? d.start
    const lf = LF.get(id)
    if (!ownEnd || !lf) continue
    if (diffDays(ownEnd, lf) <= 0) res.add(id)
  }
  return res
}
