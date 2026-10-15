/** 日期工具：全部基于本地时区，支持"天"级与"小时"级运算 */

export const MS_DAY = 86400000
export const MS_HOUR = 3600000

export type DateLike = string | Date

/** 解析 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm' / Date，避免 new Date(str) 的 UTC 偏移问题。
 *  注意：toDate 截断到天（向下取整到 00:00），小时刻度请用 toDateWithTime。 */
export function toDate(d: DateLike): Date {
  if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const s = String(d).trim()
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])
  return new Date(d)
}

/** 带时分的解析（hour 刻度用）：保留时间部分，不截断到天 */
export function toDateWithTime(d: DateLike): Date {
  if (d instanceof Date) return new Date(d)
  const s = String(d).trim()
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) {
    const hm = /(\d{1,2}):(\d{2})/.exec(s)
    return new Date(+m[1], +m[2] - 1, +m[3], hm ? +hm[1] : 0, hm ? +hm[2] : 0)
  }
  return new Date(d)
}

export function startOfDay(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 加小时 */
export function addHours(d: Date, n: number): Date {
  const r = new Date(d)
  r.setTime(r.getTime() + n * MS_HOUR)
  return r
}

/** b - a 的整天数 */
export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DAY)
}

/** b - a 的小时数（浮点，支持小数） */
export function diffHours(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_HOUR
}

/** 所在周的周一 */
export function startOfWeek(d: Date): Date {
  const r = startOfDay(d)
  return addDays(r, -((r.getDay() + 6) % 7))
}

export function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** 所在季度第一天 */
export function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
}

/** 所在半年第一天（1 月 / 7 月） */
export function startOfHalfYear(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() >= 6 ? 6 : 0, 1)
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

export function isWeekend(d: Date): boolean {
  const w = d.getDay()
  return w === 0 || w === 6
}

export function fmt(d: Date, f = 'YYYY-MM-DD'): string {
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return f
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, p(d.getMonth() + 1))
    .replace(/DD/g, p(d.getDate()))
    .replace(/HH/g, p(d.getHours()))
    .replace(/mm/g, p(d.getMinutes()))
}

export function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b
}

export function minDate(a: Date, b: Date): Date {
  return a < b ? a : b
}
