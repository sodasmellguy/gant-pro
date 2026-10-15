/**
 * geometry.ts 纯函数测试
 *
 * 覆盖：像素密度 / 时间范围 / 坐标换算 / 条形宽度 / 连线路径 / 双层刻度 / 周末列
 */
import { describe, it, expect } from 'vitest'
import {
  getPxPerDay, computeChartRange, createTimeConverter, barWidth,
  generateTopTicks, generateBottomTicks, generateWeekendCols, routeLink,
  type Geom
} from './geometry'
import { addDays, startOfDay } from './date'

const D = (s: string) => startOfDay(new Date(s))

describe('getPxPerDay', () => {
  it('should return fixed density per scale', () => {
    expect(getPxPerDay('day', 24)).toBe(34)
    expect(getPxPerDay('week', 24)).toBe(11)
    expect(getPxPerDay('month', 24)).toBe(3.2)
    expect(getPxPerDay('quarter', 24)).toBe(1.15)
    expect(getPxPerDay('year', 24)).toBe(0.3)
  })

  it('should derive hour density from hourWidth', () => {
    expect(getPxPerDay('hour', 24)).toBe(576)
    expect(getPxPerDay('hour', 10)).toBe(240)
  })
})

describe('computeChartRange', () => {
  it('should compute min/max with padding', () => {
    const { chartStart, chartEnd } = computeChartRange([
      { start: D('2025-01-10'), end: D('2025-01-20') },
      { start: D('2025-01-05'), end: D('2025-01-15') }
    ])
    // min=01-05(周日) -2天=01-03(周五)，周一起始 → 2024-12-30
    expect(chartStart.getTime()).toBe(D('2024-12-30').getTime())
    // max=01-15(周三) + padding*10=20天 → 02-04，周末为周日 → 02-09
    expect(chartEnd.getTime()).toBe(D('2025-02-09').getTime())
  })

  it('should fall back to today for empty input', () => {
    const { chartStart, chartEnd } = computeChartRange([])
    expect(chartEnd.getTime()).toBeGreaterThan(chartStart.getTime())
  })
})

describe('createTimeConverter', () => {
  it('day scale: timeToX / xToTime roundtrip', () => {
    const cs = D('2025-01-01')
    const { timeToX, xToTime } = createTimeConverter(cs, 'day', 34, 24)
    expect(timeToX(cs.getTime())).toBe(0)
    expect(timeToX(D('2025-01-11').getTime())).toBe(340)
    const back = xToTime(340)
    expect(new Date(back).getDate()).toBe(11)
  })

  it('hour scale: converts by hourWidth', () => {
    const cs = D('2025-01-01')
    const { timeToX, xToTime } = createTimeConverter(cs, 'hour', 576, 24)
    expect(timeToX(new Date(2025, 0, 1, 3).getTime())).toBe(72)
    const back = new Date(xToTime(72))
    expect(back.getHours()).toBe(3)
  })
})

describe('barWidth', () => {
  it('day scale includes both endpoints (+1 day)', () => {
    expect(barWidth(D('2025-01-01'), D('2025-01-05'), 'day', 34, 24)).toBe(5 * 34)
    expect(barWidth(D('2025-01-01'), D('2025-01-01'), 'day', 34, 24)).toBe(34)
  })

  it('hour scale uses hour diff with min 2px', () => {
    expect(barWidth(new Date(2025, 0, 1, 0), new Date(2025, 0, 1, 5), 'hour', 576, 24)).toBe(120)
    expect(barWidth(new Date(2025, 0, 1, 0), new Date(2025, 0, 1, 0), 'hour', 576, 24)).toBe(2)
  })
})

describe('routeLink', () => {
  const g = (x: number, y: number, w: number, milestone = false): Geom => ({
    id: 'g', task: { id: 'g', name: 'g' }, x, w, y, h: 24,
    milestone, summary: false, baseline: false, bx: 0, bw: 0, overdue: false, critical: false
  })

  it('fs same-row should render straight line', () => {
    const d = routeLink(g(100, 0, 50), g(200, 0, 50), 'fs')
    expect(d).toBe('M 150 12 L 200 12')
  })

  it('fs across rows should bend through vertical segments', () => {
    const d = routeLink(g(100, 0, 50), g(200, 36, 50), 'fs')
    expect(d).toMatch(/^M 150 12/)
    expect(d).toContain('L 159')
    expect(d.endsWith('L 200 48')).toBe(true)
  })

  it('ss / ff anchor to start/end sides respectively', () => {
    const ss = routeLink(g(100, 0, 50), g(200, 36, 50), 'ss')
    expect(ss.startsWith('M 100 12')).toBe(true)
    const ff = routeLink(g(100, 0, 50), g(200, 36, 50), 'ff')
    expect(ff.startsWith('M 150 12')).toBe(true)
  })

  it('milestone anchors at center', () => {
    const d = routeLink(g(100, 0, 20, true), g(200, 36, 50), 'fs')
    expect(d.startsWith('M 110 12')).toBe(true)
  })

  it('backward links should jog around the source bar', () => {
    // 目标端在源端后方：出线后向上/向下绕行再折回
    const d = routeLink(g(200, 0, 50), g(100, 36, 50), 'fs')
    expect(d).toBe('M 250 12 L 259 12 L 259 31 L 91 31 L 91 48 L 100 48')
  })
})

describe('generateTopTicks', () => {
  it('day scale aggregates by month', () => {
    const ticks = generateTopTicks(D('2025-01-01'), D('2025-02-28'), 'day', 34, 24, { year: '年', month: '月' })
    expect(ticks).toHaveLength(2)
    expect(ticks[0].label).toBe('1月')
    expect(ticks[0].left).toBe(0)
    expect(ticks[0].width).toBe(31 * 34)
    expect(ticks[1].label).toBe('2月')
    expect(ticks[1].width).toBe(28 * 34)
  })

  it('hour scale produces one tick per day', () => {
    const ticks = generateTopTicks(D('2025-01-01'), D('2025-01-03'), 'hour', 576, 24, { year: '年', month: '月' })
    expect(ticks).toHaveLength(3)
    expect(ticks[0].label).toBe('1/1')
    expect(ticks[0].width).toBe(576)
  })

  it('quarter/year scale labels years', () => {
    const ticks = generateTopTicks(D('2024-06-01'), D('2025-06-30'), 'quarter', 1.15, 24, { year: '年', month: '月' })
    expect(ticks.map(t => t.label)).toEqual(['2024年', '2025年'])
  })
})

describe('generateBottomTicks', () => {
  it('day scale: one tick per day with weekend flag', () => {
    // 2025-01-06 周一 ~ 2025-01-12 周日
    const ticks = generateBottomTicks(D('2025-01-06'), D('2025-01-12'), 'day', 34, 24, { quarter: 'Q', month: '月', firstHalf: '上半年', secondHalf: '下半年' })
    expect(ticks).toHaveLength(7)
    expect(ticks.map(t => t.label)).toEqual(['6', '7', '8', '9', '10', '11', '12'])
    expect(ticks[5].weekend).toBe(true)
    expect(ticks[6].weekend).toBe(true)
    expect(ticks[0].left).toBe(0)
    expect(ticks[1].left).toBe(34)
  })

  it('hour scale: 24 ticks per day, degrade to 3h step when hourWidth < 14', () => {
    const full = generateBottomTicks(D('2025-01-01'), D('2025-01-01'), 'hour', 576, 24, { quarter: 'Q', month: '月', firstHalf: 'H1', secondHalf: 'H2' })
    expect(full).toHaveLength(24)
    const degraded = generateBottomTicks(D('2025-01-01'), D('2025-01-01'), 'hour', 240, 10, { quarter: 'Q', month: '月', firstHalf: 'H1', secondHalf: 'H2' })
    expect(degraded).toHaveLength(8)
    expect(degraded[1].label).toBe('03')
  })

  it('week scale: weekly labels', () => {
    const ticks = generateBottomTicks(D('2025-01-06'), D('2025-01-19'), 'week', 11, 24, { quarter: 'Q', month: '月', firstHalf: 'H1', secondHalf: 'H2' })
    expect(ticks).toHaveLength(2)
    expect(ticks[0].label).toBe('1/6')
    expect(ticks[0].width).toBe(7 * 11)
  })

  it('quarter scale: Q1-Q4 labels', () => {
    const ticks = generateBottomTicks(D('2025-01-01'), D('2025-06-30'), 'quarter', 1.15, 24, { quarter: 'Q', month: '月', firstHalf: 'H1', secondHalf: 'H2' })
    expect(ticks.map(t => t.label)).toEqual(['Q1', 'Q2'])
  })

  it('year scale: half-year labels', () => {
    const ticks = generateBottomTicks(D('2025-01-01'), D('2025-12-31'), 'year', 0.3, 24, { quarter: 'Q', month: '月', firstHalf: '上半年', secondHalf: '下半年' })
    expect(ticks.map(t => t.label)).toEqual(['上半年', '下半年'])
  })

  it('month scale: monthly labels', () => {
    const ticks = generateBottomTicks(D('2025-01-15'), D('2025-03-15'), 'month', 3.2, 24, { quarter: 'Q', month: '月', firstHalf: 'H1', secondHalf: 'H2' })
    expect(ticks.map(t => t.label)).toEqual(['1月', '2月', '3月'])
  })
})

describe('generateWeekendCols', () => {
  it('day scale: weekend columns only', () => {
    const cols = generateWeekendCols(D('2025-01-06'), D('2025-01-12'), 'day', 34)
    expect(cols).toEqual([
      { left: 5 * 34, width: 34 },
      { left: 6 * 34, width: 34 }
    ])
  })

  it('non-day/hour scale returns empty', () => {
    expect(generateWeekendCols(D('2025-01-01'), D('2025-01-31'), 'week', 11)).toHaveLength(0)
    expect(generateWeekendCols(D('2025-01-01'), D('2025-01-31'), 'month', 3.2)).toHaveLength(0)
  })

  it('hour scale: weekend days still marked', () => {
    // 2025-01-06(一) ~ 2025-01-07(二)：无周末
    expect(generateWeekendCols(D('2025-01-06'), D('2025-01-07'), 'hour', 576)).toHaveLength(0)
    // 2025-01-11(六)：一个周末日
    expect(generateWeekendCols(D('2025-01-11'), D('2025-01-11'), 'hour', 576)).toHaveLength(1)
  })
})

describe('addDays sanity (依赖 date.ts)', () => {
  it('cross-month arithmetic', () => {
    expect(addDays(D('2025-01-31'), 1).getDate()).toBe(1)
  })
})
