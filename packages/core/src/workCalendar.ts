/**
 * 工作日历：自定义工作日/休息日，进度排除非工作日
 */
import type { DateLike } from './date'
import { toDate, startOfDay, addDays, diffDays, isWeekend } from './date'

export interface WorkCalendarConfig {
  /** 每周休息日（0=周日, 6=周六），默认 [0, 6] */
  weekendDays?: number[]
  /** 额外休息日（节假日） */
  holidays?: (string | Date)[]
  /** 额外工作日（调休补班） */
  workdays?: (string | Date)[]
}

/** 创建工作日历实例 */
export function createWorkCalendar(config: WorkCalendarConfig = {}) {
  const weekendDays = new Set(config.weekendDays ?? [0, 6])
  const holidaySet = new Set<string>()
  const workdaySet = new Set<string>()

  const toKey = (d: DateLike): string => {
    const dt = toDate(d)
    return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`
  }

  for (const h of config.holidays ?? []) holidaySet.add(toKey(h))
  for (const w of config.workdays ?? []) workdaySet.add(toKey(w))

  /** 判断某天是否为工作日 */
  function isWorkday(d: DateLike): boolean {
    const dt = toDate(d)
    const key = toKey(dt)
    // 调休补班优先
    if (workdaySet.has(key)) return true
    // 节假日
    if (holidaySet.has(key)) return false
    // 周末
    if (weekendDays.has(dt.getDay())) return false
    return true
  }

  /** 判断某天是否为休息日 */
  function isHoliday(d: DateLike): boolean {
    return !isWorkday(d)
  }

  /** 计算两个日期之间的工作日数（含起止当天） */
  function workdayCount(start: DateLike, end: DateLike): number {
    const s = startOfDay(toDate(start))
    const e = startOfDay(toDate(end))
    if (s > e) return 0
    let count = 0
    let cur = s
    while (cur <= e) {
      if (isWorkday(cur)) count++
      cur = addDays(cur, 1)
    }
    return count
  }

  /** 排除非工作日后的有效工期天数（end - start + 1 减去休息日） */
  function effectiveDuration(start: DateLike, end: DateLike): number {
    return workdayCount(start, end)
  }

  /** 从某天起加 N 个工作日 */
  function addWorkdays(start: DateLike, n: number): Date {
    let cur = startOfDay(toDate(start))
    let added = 0
    const dir = n >= 0 ? 1 : -1
    const target = Math.abs(n)
    while (added < target) {
      cur = addDays(cur, dir)
      if (isWorkday(cur)) added++
    }
    return cur
  }

  /** 获取某月所有休息日列表 */
  function getHolidaysInMonth(year: number, month: number): Date[] {
    const result: Date[] = []
    const days = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= days; i++) {
      const d = new Date(year, month, i)
      if (isHoliday(d)) result.push(d)
    }
    return result
  }

  return {
    isWorkday,
    isHoliday,
    workdayCount,
    effectiveDuration,
    addWorkdays,
    getHolidaysInMonth,
    config: { weekendDays: [...weekendDays], holidays: config.holidays, workdays: config.workdays }
  }
}

export type WorkCalendar = ReturnType<typeof createWorkCalendar>
