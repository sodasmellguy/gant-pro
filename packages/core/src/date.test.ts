import { describe, it, expect } from 'vitest'
import {
  toDate, toDateWithTime, startOfDay, addDays, addHours,
  diffDays, diffHours, startOfWeek, endOfWeek, startOfMonth,
  startOfQuarter, startOfHalfYear, daysInMonth, isWeekend,
  fmt, maxDate, minDate, MS_DAY, MS_HOUR
} from './date'

describe('date utils', () => {
  describe('toDate', () => {
    it('should parse YYYY-MM-DD string', () => {
      const d = toDate('2025-03-15')
      expect(d.getFullYear()).toBe(2025)
      expect(d.getMonth()).toBe(2) // 0-indexed
      expect(d.getDate()).toBe(15)
    })

    it('should truncate to start of day', () => {
      const d = toDate('2025-03-15T14:30')
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
    })

    it('should handle Date input', () => {
      const input = new Date(2025, 5, 20, 10, 30)
      const d = toDate(input)
      expect(d.getFullYear()).toBe(2025)
      expect(d.getMonth()).toBe(5)
      expect(d.getDate()).toBe(20)
      expect(d.getHours()).toBe(0)
    })

    it('should handle single-digit month/day', () => {
      const d = toDate('2025-1-5')
      expect(d.getMonth()).toBe(0)
      expect(d.getDate()).toBe(5)
    })
  })

  describe('toDateWithTime', () => {
    it('should preserve time part', () => {
      const d = toDateWithTime('2025-03-15T14:30')
      expect(d.getHours()).toBe(14)
      expect(d.getMinutes()).toBe(30)
    })

    it('should default to 00:00 when no time specified', () => {
      const d = toDateWithTime('2025-03-15')
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
    })

    it('should handle Date input by cloning', () => {
      const input = new Date(2025, 5, 20, 10, 30)
      const d = toDateWithTime(input)
      expect(d.getHours()).toBe(10)
      expect(d.getMinutes()).toBe(30)
      // Should be a clone, not same reference
      expect(d).not.toBe(input)
    })
  })

  describe('startOfDay', () => {
    it('should zero out hours', () => {
      const d = new Date(2025, 2, 15, 14, 30, 45)
      const s = startOfDay(d)
      expect(s.getHours()).toBe(0)
      expect(s.getMinutes()).toBe(0)
      expect(s.getSeconds()).toBe(0)
    })
  })

  describe('addDays', () => {
    it('should add positive days', () => {
      const d = new Date(2025, 0, 1)
      const r = addDays(d, 10)
      expect(r.getDate()).toBe(11)
    })

    it('should add negative days (subtract)', () => {
      const d = new Date(2025, 0, 10)
      const r = addDays(d, -5)
      expect(r.getDate()).toBe(5)
    })

    it('should handle month boundary', () => {
      const d = new Date(2025, 0, 30)
      const r = addDays(d, 5)
      expect(r.getMonth()).toBe(1)
      expect(r.getDate()).toBe(4)
    })

    it('should not mutate original date', () => {
      const d = new Date(2025, 0, 1)
      addDays(d, 10)
      expect(d.getDate()).toBe(1)
    })
  })

  describe('addHours', () => {
    it('should add hours correctly', () => {
      const d = new Date(2025, 0, 1, 9, 0)
      const r = addHours(d, 5)
      expect(r.getHours()).toBe(14)
    })

    it('should handle day boundary', () => {
      const d = new Date(2025, 0, 1, 20, 0)
      const r = addHours(d, 5)
      expect(r.getDate()).toBe(2)
      expect(r.getHours()).toBe(1)
    })

    it('should support fractional hours', () => {
      const d = new Date(2025, 0, 1, 9, 0)
      const r = addHours(d, 1.5)
      expect(r.getMinutes()).toBe(30)
    })
  })

  describe('diffDays', () => {
    it('should compute positive difference', () => {
      const a = new Date(2025, 0, 1)
      const b = new Date(2025, 0, 10)
      expect(diffDays(a, b)).toBe(9)
    })

    it('should compute negative difference', () => {
      const a = new Date(2025, 0, 10)
      const b = new Date(2025, 0, 1)
      expect(diffDays(a, b)).toBe(-9)
    })

    it('should return 0 for same day', () => {
      const a = new Date(2025, 0, 1, 5)
      const b = new Date(2025, 0, 1, 23)
      expect(diffDays(a, b)).toBe(0)
    })
  })

  describe('diffHours', () => {
    it('should compute fractional hours', () => {
      const a = new Date(2025, 0, 1, 9, 0)
      const b = new Date(2025, 0, 1, 14, 30)
      expect(diffHours(a, b)).toBe(5.5)
    })

    it('should compute across days', () => {
      const a = new Date(2025, 0, 1, 9, 0)
      const b = new Date(2025, 0, 2, 9, 0)
      expect(diffHours(a, b)).toBe(24)
    })
  })

  describe('startOfWeek', () => {
    it('should return Monday for a Wednesday', () => {
      const d = new Date(2025, 2, 12) // Wednesday March 12 2025
      const w = startOfWeek(d)
      expect(w.getDay()).toBe(1) // Monday
      expect(w.getDate()).toBe(10)
    })

    it('should return Monday for a Sunday', () => {
      const d = new Date(2025, 2, 16) // Sunday March 16 2025
      const w = startOfWeek(d)
      expect(w.getDay()).toBe(1)
      expect(w.getDate()).toBe(10)
    })

    it('should handle Saturday', () => {
      const d = new Date(2025, 2, 15) // Saturday March 15 2025
      const w = startOfWeek(d)
      expect(w.getDay()).toBe(1)
      expect(w.getDate()).toBe(10)
    })
  })

  describe('endOfWeek', () => {
    it('should return Sunday', () => {
      const d = new Date(2025, 2, 12) // Wednesday
      const e = endOfWeek(d)
      expect(e.getDay()).toBe(0) // Sunday
      expect(e.getDate()).toBe(16)
    })
  })

  describe('startOfMonth', () => {
    it('should return first day of month', () => {
      const d = new Date(2025, 2, 15)
      const m = startOfMonth(d)
      expect(m.getDate()).toBe(1)
    })
  })

  describe('startOfQuarter', () => {
    it('should return Q1 start for January', () => {
      const d = new Date(2025, 0, 15)
      const q = startOfQuarter(d)
      expect(q.getMonth()).toBe(0)
    })

    it('should return Q2 start for May', () => {
      const d = new Date(2025, 4, 15)
      const q = startOfQuarter(d)
      expect(q.getMonth()).toBe(3)
    })

    it('should return Q3 start for August', () => {
      const d = new Date(2025, 7, 15)
      const q = startOfQuarter(d)
      expect(q.getMonth()).toBe(6)
    })

    it('should return Q4 start for November', () => {
      const d = new Date(2025, 10, 15)
      const q = startOfQuarter(d)
      expect(q.getMonth()).toBe(9)
    })
  })

  describe('startOfHalfYear', () => {
    it('should return Jan 1 for first half', () => {
      const d = new Date(2025, 3, 15)
      const h = startOfHalfYear(d)
      expect(h.getMonth()).toBe(0)
    })

    it('should return Jul 1 for second half', () => {
      const d = new Date(2025, 8, 15)
      const h = startOfHalfYear(d)
      expect(h.getMonth()).toBe(6)
    })
  })

  describe('daysInMonth', () => {
    it('should return 31 for January', () => {
      expect(daysInMonth(new Date(2025, 0, 1))).toBe(31)
    })

    it('should return 28 for February non-leap year', () => {
      expect(daysInMonth(new Date(2025, 1, 1))).toBe(28)
    })

    it('should return 29 for February leap year', () => {
      expect(daysInMonth(new Date(2024, 1, 1))).toBe(29)
    })
  })

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      expect(isWeekend(new Date(2025, 2, 15))).toBe(true)
    })

    it('should return true for Sunday', () => {
      expect(isWeekend(new Date(2025, 2, 16))).toBe(true)
    })

    it('should return false for Monday', () => {
      expect(isWeekend(new Date(2025, 2, 10))).toBe(false)
    })
  })

  describe('fmt', () => {
    it('should format YYYY-MM-DD', () => {
      const d = new Date(2025, 2, 5)
      expect(fmt(d)).toBe('2025-03-05')
    })

    it('should format YYYY-MM-DD HH:mm', () => {
      const d = new Date(2025, 2, 5, 9, 7)
      expect(fmt(d, 'YYYY-MM-DDTHH:mm')).toBe('2025-03-05T09:07')
    })

    it('should pad single digits', () => {
      const d = new Date(2025, 0, 1, 1, 2)
      expect(fmt(d, 'YYYY-MM-DD HH:mm')).toBe('2025-01-01 01:02')
    })
  })

  describe('maxDate / minDate', () => {
    it('maxDate should return the later date', () => {
      const a = new Date(2025, 0, 1)
      const b = new Date(2025, 0, 10)
      expect(maxDate(a, b)).toBe(b)
    })

    it('minDate should return the earlier date', () => {
      const a = new Date(2025, 0, 1)
      const b = new Date(2025, 0, 10)
      expect(minDate(a, b)).toBe(a)
    })
  })

  describe('constants', () => {
    it('MS_DAY should be 86400000', () => {
      expect(MS_DAY).toBe(86400000)
    })

    it('MS_HOUR should be 3600000', () => {
      expect(MS_HOUR).toBe(3600000)
    })
  })
})
