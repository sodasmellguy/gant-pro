/**
 * 几何计算模块（纯函数，框架无关）
 *
 * 包含：刻度生成、坐标换算、条形几何、连线路径
 */

import type { ScaleType } from './types'
import {
  addDays, addHours, daysInMonth, diffDays, diffHours,
  isWeekend, maxDate, minDate,
  startOfDay, startOfMonth, startOfQuarter, startOfHalfYear, startOfWeek,
  endOfWeek
} from './date'

const PX_PER_DAY: Record<Exclude<ScaleType, 'hour'>, number> = {
  day: 34, week: 11, month: 3.2, quarter: 1.15, year: 0.3
}

/** 计算每天像素宽度 */
export function getPxPerDay(scale: ScaleType, hourWidth: number): number {
  return scale === 'hour' ? hourWidth * 24 : PX_PER_DAY[scale as Exclude<ScaleType, 'hour'>]
}

export interface Tick {
  left: number
  width: number
  label: string
  weekend?: boolean
}

export interface Geom {
  id: string
  task: import('./types').GanttTask
  x: number
  w: number
  y: number
  h: number
  milestone: boolean
  summary: boolean
  baseline: boolean
  bx: number
  bw: number
  overdue: boolean
  critical: boolean
  segments?: { x: number; w: number; progress?: number; color?: string }[]
  expectedX?: number
}

export interface LinkPath {
  key: string
  link: import('./types').GanttLink
  d: string
  color: string
  critical: boolean
}

/** 计算时间范围 */
export function computeChartRange(
  dates: { start: Date; end: Date }[],
  padding = 2
): { chartStart: Date; chartEnd: Date } {
  let min: Date | null = null
  let max: Date | null = null
  for (const { start, end } of dates) {
    if (!min || start < min) min = start
    if (!max || end > max) max = end
  }
  if (!min) min = startOfDay(new Date())
  if (!max) max = addDays(startOfDay(new Date()), 30)
  return {
    chartStart: startOfWeek(addDays(min, -padding)),
    chartEnd: endOfWeek(addDays(max, padding * 10))
  }
}

/** 时间戳 -> x 像素坐标 */
export function createTimeConverter(
  chartStart: Date,
  scale: ScaleType,
  pxPerDay: number,
  hourWidth: number
): { timeToX: (ts: number) => number; xToTime: (px: number) => number } {
  return {
    timeToX(ts: number): number {
      const d = new Date(ts)
      return scale === 'hour'
        ? diffHours(chartStart, d) * hourWidth
        : diffDays(chartStart, d) * pxPerDay
    },
    xToTime(px: number): number {
      return scale === 'hour'
        ? addHours(chartStart, px / hourWidth).getTime()
        : addDays(chartStart, Math.round(px / pxPerDay)).getTime()
    }
  }
}

/** 计算条形宽度 */
export function barWidth(start: Date, end: Date, scale: ScaleType, pxPerDay: number, hourWidth: number): number {
  if (scale === 'hour') return Math.max(diffHours(start, end) * hourWidth, 2)
  return (diffDays(start, end) + 1) * pxPerDay
}

/** 连线路径生成 */
export function routeLink(a: Geom, b: Geom, type: import('./types').LinkType): string {
  const ay = a.y + a.h / 2
  const by = b.y + b.h / 2
  const gap = 9
  let sx: number, dirOut: 1 | -1, tx: number, tw: number, dirIn: 1 | -1
  if (type === 'fs') {
    sx = a.milestone ? a.x + a.w / 2 : a.x + a.w; dirOut = 1
    tx = b.milestone ? b.x + b.w / 2 : b.x; tw = b.milestone ? 0 : b.w; dirIn = -1
  } else if (type === 'ss') {
    sx = a.milestone ? a.x + a.w / 2 : a.x; dirOut = -1
    tx = b.milestone ? b.x + b.w / 2 : b.x; tw = b.milestone ? 0 : b.w; dirIn = -1
  } else if (type === 'ff') {
    sx = a.milestone ? a.x + a.w / 2 : a.x + a.w; dirOut = 1
    tx = b.milestone ? b.x + b.w / 2 : b.x + b.w; tw = b.milestone ? 0 : b.w; dirIn = 1
  } else {
    sx = a.milestone ? a.x + a.w / 2 : a.x; dirOut = -1
    tx = b.milestone ? b.x + b.w / 2 : b.x + b.w; tw = b.milestone ? 0 : b.w; dirIn = 1
  }
  const startOut = sx + dirOut * gap
  const endIn = dirIn === -1 ? tx - gap : tx + tw + gap
  const port = dirIn === -1 ? tx : tx + tw
  const straight = dirOut === 1 ? port >= startOut : port <= startOut
  if (Math.abs(by - ay) < 0.5 && straight) {
    return `M ${sx} ${ay} L ${port} ${by}`
  }
  const needJog = dirOut === 1 ? endIn < startOut : endIn > startOut
  const bendY = needJog ? (by > ay ? a.y + a.h + 7 : a.y - 7) : by
  return `M ${sx} ${ay} L ${startOut} ${ay} L ${startOut} ${bendY} L ${endIn} ${bendY} L ${endIn} ${by} L ${port} ${by}`
}

/** 生成上层聚合刻度 */
export function generateTopTicks(
  chartStart: Date,
  chartEnd: Date,
  scale: ScaleType,
  pxPerDay: number,
  hourWidth: number,
  labels: { year: string; month: string }
): Tick[] {
  const res: Tick[] = []
  const totalDays = diffDays(chartStart, chartEnd) + 1
  const x = (d: Date) => scale === 'hour'
    ? diffHours(chartStart, d) * hourWidth
    : diffDays(chartStart, d) * pxPerDay

  if (scale === 'hour') {
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(chartStart, i)
      const from = maxDate(d, chartStart)
      const to = minDate(d, chartEnd)
      res.push({
        left: x(from),
        width: (diffDays(from, to) + 1) * pxPerDay,
        label: `${from.getMonth() + 1}/${from.getDate()}`,
        weekend: isWeekend(d)
      })
    }
    return res
  }
  if (scale === 'quarter' || scale === 'year') {
    let y = new Date(chartStart.getFullYear(), 0, 1)
    while (y <= chartEnd) {
      const from = maxDate(y, chartStart)
      const to = minDate(addDays(new Date(y.getFullYear() + 1, 0, 1), -1), chartEnd)
      res.push({
        left: x(from),
        width: (diffDays(from, to) + 1) * pxPerDay,
        label: `${y.getFullYear()}${labels.year}`
      })
      y = new Date(y.getFullYear() + 1, 0, 1)
    }
    return res
  }
  let m = startOfMonth(chartStart)
  while (m <= chartEnd) {
    const from = maxDate(m, chartStart)
    const to = minDate(addDays(startOfMonth(addDays(m, daysInMonth(m))), -1), chartEnd)
    res.push({
      left: x(from),
      width: (diffDays(from, to) + 1) * pxPerDay,
      label: scale === 'month' ? `${m.getFullYear()}${labels.year}` : `${m.getMonth() + 1}${labels.month}`
    })
    m = addDays(m, daysInMonth(m))
  }
  return res
}

/** 生成底层基础刻度 */
export function generateBottomTicks(
  chartStart: Date,
  chartEnd: Date,
  scale: ScaleType,
  pxPerDay: number,
  hourWidth: number,
  labels: { quarter: string; month: string; firstHalf: string; secondHalf: string }
): Tick[] {
  const res: Tick[] = []
  const p = pxPerDay
  const totalDays = diffDays(chartStart, chartEnd) + 1
  const x = (d: Date) => scale === 'hour'
    ? diffHours(chartStart, d) * hourWidth
    : diffDays(chartStart, d) * p

  if (scale === 'hour') {
    const hw = hourWidth
    const step = hw < 14 ? 3 : 1
    for (let i = 0; i < totalDays; i++) {
      const dayStart = addDays(chartStart, i)
      for (let h = 0; h < 24; h += step) {
        res.push({
          left: i * p + h * hw,
          width: hw * step,
          label: h < 10 ? `0${h}` : String(h),
          weekend: isWeekend(dayStart)
        })
      }
    }
    return res
  }
  if (scale === 'day') {
    for (let i = 0; i < totalDays; i++) {
      res.push({ left: i * p, width: p, label: String(addDays(chartStart, i).getDate()), weekend: isWeekend(addDays(chartStart, i)) })
    }
  } else if (scale === 'week') {
    let w = startOfWeek(chartStart)
    while (w <= chartEnd) {
      const from = maxDate(w, chartStart)
      const to = minDate(addDays(w, 6), chartEnd)
      res.push({ left: x(from), width: (diffDays(from, to) + 1) * p, label: `${from.getMonth() + 1}/${from.getDate()}` })
      w = addDays(w, 7)
    }
  } else if (scale === 'quarter') {
    let q = startOfQuarter(chartStart)
    while (q <= chartEnd) {
      const next = new Date(q.getFullYear(), q.getMonth() + 3, 1)
      const from = maxDate(q, chartStart)
      const to = minDate(addDays(next, -1), chartEnd)
      res.push({ left: x(from), width: (diffDays(from, to) + 1) * p, label: `${labels.quarter}${Math.floor(q.getMonth() / 3) + 1}` })
      q = next
    }
  } else if (scale === 'year') {
    let h2 = startOfHalfYear(chartStart)
    while (h2 <= chartEnd) {
      const next = new Date(h2.getFullYear(), h2.getMonth() + 6, 1)
      const from = maxDate(h2, chartStart)
      const to = minDate(addDays(next, -1), chartEnd)
      res.push({ left: x(from), width: (diffDays(from, to) + 1) * p, label: h2.getMonth() === 0 ? labels.firstHalf : labels.secondHalf })
      h2 = next
    }
  } else {
    let m = startOfMonth(chartStart)
    while (m <= chartEnd) {
      const from = maxDate(m, chartStart)
      const to = minDate(addDays(startOfMonth(addDays(m, daysInMonth(m))), -1), chartEnd)
      res.push({ left: x(from), width: (diffDays(from, to) + 1) * p, label: `${m.getMonth() + 1}${labels.month}` })
      m = addDays(m, daysInMonth(m))
    }
  }
  return res
}

/** 周末列 */
export function generateWeekendCols(
  chartStart: Date,
  chartEnd: Date,
  scale: ScaleType,
  pxPerDay: number
): { left: number; width: number }[] {
  if (scale !== 'day' && scale !== 'hour') return []
  const res: { left: number; width: number }[] = []
  const totalDays = diffDays(chartStart, chartEnd) + 1
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(chartStart, i)
    if (isWeekend(d)) res.push({ left: i * pxPerDay, width: pxPerDay })
  }
  return res
}
