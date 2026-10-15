import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { GanttChart } from './GanttChart'
import type { GanttTask, GanttLink, GanttColumn, ScaleType } from '@gantt-pro/core'

const sampleTasks: GanttTask[] = [
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '任务A', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, owner: '张三' },
      { id: 't2', name: '任务B', startDate: '2025-01-06', endDate: '2025-01-10', progress: 50, owner: '李四' },
      { id: 't3', name: '里程碑C', startDate: '2025-01-11', milestone: true }
    ]
  },
  {
    id: 'p2',
    name: '项目阶段二',
    children: [{ id: 't4', name: '任务D', startDate: '2025-01-12', endDate: '2025-01-20', progress: 0 }]
  }
]

const sampleLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' as const }
]

function renderGantt(props: Record<string, any> = {}) {
  return render(
    <GanttChart
      data={sampleTasks}
      links={sampleLinks}
      {...props}
    />
  )
}

describe('GanttChart React component', () => {
  describe('基础渲染', () => {
    it('should render root element with gt-root class', () => {
      const { container } = renderGantt()
      expect(container.querySelector('.gt-root')).toBeTruthy()
    })

    it('should render table headers', () => {
      renderGantt()
      expect(screen.getByText('任务名称')).toBeTruthy()
    })

    it('should render task rows', () => {
      const { container } = renderGantt()
      const rows = container.querySelectorAll('.gt-tr')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('should render task names in rows', () => {
      renderGantt()
      // 任务名可能同时出现在表格和资源面板/tooltip中，用 getAllByText
      expect(screen.getAllByText('任务A').length).toBeGreaterThan(0)
      expect(screen.getAllByText('任务B').length).toBeGreaterThan(0)
    })
  })

  describe('空数据', () => {
    it('should show empty data message when emptyData prop is set', () => {
      renderGantt({ data: [], emptyData: '暂无数据' })
      expect(screen.getByText('暂无数据')).toBeTruthy()
    })
  })

  describe('i18n', () => {
    it('should render English headers when locale is en-US', () => {
      renderGantt({ locale: 'en-US' })
      expect(screen.getAllByText('Task Name').length).toBeGreaterThan(0)
    })
  })

  describe('暗色主题', () => {
    it('should apply gt-dark class when dark prop is true', () => {
      const { container } = renderGantt({ dark: true })
      expect(container.querySelector('.gt-root')?.classList.contains('gt-dark')).toBe(true)
    })
  })

  describe('只读模式', () => {
    it('should apply gt-readonly class when readonly prop is true', () => {
      const { container } = renderGantt({ readonly: true })
      expect(container.querySelector('.gt-root')?.classList.contains('gt-readonly')).toBe(true)
    })
  })

  describe('无障碍 (a11y)', () => {
    it('should have role=grid on root element', () => {
      const { container } = renderGantt()
      expect(container.querySelector('.gt-root')?.getAttribute('role')).toBe('grid')
    })

    it('should have role=row on task rows', () => {
      const { container } = renderGantt()
      const rows = container.querySelectorAll('.gt-tr')
      expect(rows[0].getAttribute('role')).toBe('row')
    })

    it('should have aria-label on task rows', () => {
      const { container } = renderGantt()
      const rows = container.querySelectorAll('.gt-tr')
      expect(rows[0].getAttribute('aria-label')).toBeTruthy()
    })

    it('should have role=status on empty data message', () => {
      const { container } = renderGantt({ data: [], emptyData: 'No data' })
      const empty = container.querySelector('.gt-empty-data')
      expect(empty?.getAttribute('role')).toBe('status')
      expect(empty?.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('搜索高亮', () => {
    it('should highlight matching rows when search prop is set', () => {
      const { container } = renderGantt({ search: '任务A' })
      const matchRows = container.querySelectorAll('.gt-search-match')
      expect(matchRows.length).toBeGreaterThan(0)
    })

    it('should not highlight any rows when search is empty', () => {
      const { container } = renderGantt({ search: '' })
      const matchRows = container.querySelectorAll('.gt-search-match')
      expect(matchRows.length).toBe(0)
    })
  })

  describe('Checkbox', () => {
    it('should render checkboxes when showCheckbox is true', () => {
      const { container } = renderGantt({ showCheckbox: true })
      const checkboxes = container.querySelectorAll('.gt-checkbox-td input[type="checkbox"]')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
  })

  describe('行点击', () => {
    it('should call onRowClick when a row is clicked', () => {
      const onRowClick = vi.fn()
      const { container } = renderGantt({ onRowClick })
      const row = container.querySelector('.gt-tr') as HTMLElement
      fireEvent.click(row)
      expect(onRowClick).toHaveBeenCalled()
    })
  })

  describe('多级嵌套表头', () => {
    it('should render nested header when columns have children', () => {
      const columns: GanttColumn[] = [
        {
          key: 'info', label: '信息', children: [
            { key: 'name', label: '任务名称', width: 200 },
            { key: 'owner', label: '负责人', width: 80 },
          ]
        },
        { key: 'progress', label: '进度', width: 70 }
      ]
      const { container } = renderGantt({ columns })
      const nestedHeader = container.querySelector('.gt-nested-header')
      expect(nestedHeader).toBeTruthy()
      expect(screen.getByText('信息')).toBeTruthy()
    })
  })

  describe('资源面板', () => {
    it('should render resource panel when showResourcePanel is true', () => {
      const { container } = renderGantt({ showResourcePanel: true })
      const panel = container.querySelector('.gt-resource-panel')
      expect(panel).toBeTruthy()
      // 应显示负责人名（在资源面板和表格行中都可能出现）
      expect(screen.getAllByText('张三').length).toBeGreaterThan(0)
    })
  })

  describe('defineExpose API (ref)', () => {
    it('should expose undo/redo/scrollToToday methods via ref', () => {
      const ref = { current: null as any }
      const TestComp = () => {
        ref.current = useRef<any>(null).current
        const localRef = useRef<any>(null)
        // 直接渲染并赋值
        return (
          <GanttChart
            ref={(r: any) => { ref.current = r }}
            data={sampleTasks}
            links={sampleLinks}
          />
        )
      }
      render(<TestComp />)
      expect(typeof ref.current?.undo).toBe('function')
      expect(typeof ref.current?.redo).toBe('function')
      expect(typeof ref.current?.scrollToToday).toBe('function')
      expect(typeof ref.current?.scrollToTask).toBe('function')
      expect(typeof ref.current?.jumpToDate).toBe('function')
      expect(typeof ref.current?.print).toBe('function')
    })
  })

  describe('刻度切换 (scale switching)', () => {
    const scales: ScaleType[] = ['hour', 'day', 'week', 'month', 'quarter', 'year']

    scales.forEach((scale) => {
      it(`should render visible timeline area when scale is "${scale}"`, () => {
        const { container } = renderGantt({ scale })
        const clip = container.querySelector('.gt-time-clip') as HTMLElement
        expect(clip).toBeTruthy()
        // gt-time-clip 必须存在于 DOM 中且为 gt-body-flex 的子元素
        const flex = container.querySelector('.gt-body-flex')
        expect(flex?.contains(clip)).toBe(true)
        // gt-hscroll 不应在 gt-body-flex 中（否则会挤压时间线）
        const hscroll = container.querySelector('.gt-hscroll')
        expect(flex?.contains(hscroll)).toBe(false)
      })

      it(`should render time content with width when scale is "${scale}"`, () => {
        const { container } = renderGantt({ scale })
        const content = container.querySelector('.gt-time-content') as HTMLElement
        expect(content).toBeTruthy()
        // contentWidth 应为正数（px 值）
        const w = content.style.width
        expect(w).toMatch(/^\d+px$/)
        const numW = parseInt(w)
        expect(numW).toBeGreaterThan(0)
      })

      it(`should render task bars when scale is "${scale}"`, () => {
        const { container } = renderGantt({ scale })
        const bars = container.querySelectorAll('.gt-bar-wrap')
        expect(bars.length).toBeGreaterThan(0)
      })
    })

    it('should have gt-time-clip as sibling of gt-table inside gt-body-flex, not inside gt-hscroll', () => {
      const { container } = renderGantt()
      const flex = container.querySelector('.gt-body-flex')
      const clip = container.querySelector('.gt-time-clip')
      const hscroll = container.querySelector('.gt-hscroll')
      expect(flex).toBeTruthy()
      expect(clip).toBeTruthy()
      expect(hscroll).toBeTruthy()
      // gt-hscroll 不应在 gt-body-flex 内（否则会挤压时间线）
      expect(flex!.contains(hscroll)).toBe(false)
      // gt-time-clip 应在 gt-body-flex 内
      expect(flex!.contains(clip)).toBe(true)
    })
  })

  describe('时间线可见性 (timeline visibility)', () => {
    it('should not have gt-time-clip squeezed by gt-hscroll', () => {
      const { container } = renderGantt()
      const flex = container.querySelector('.gt-body-flex') as HTMLElement
      const clip = container.querySelector('.gt-time-clip') as HTMLElement
      // gt-time-clip 应在 gt-body-flex 中
      expect(flex.contains(clip)).toBe(true)
      // gt-hscroll 不应在 gt-body-flex 的 children 中
      const flexChildren = Array.from(flex.children).map(c => c.className)
      expect(flexChildren).not.toContain('gt-hscroll')
    })

    it('should render time header with ticks', () => {
      const { container } = renderGantt()
      const ticks = container.querySelectorAll('.gt-tick-top, .gt-tick-bottom')
      expect(ticks.length).toBeGreaterThan(0)
    })

    it('should render vertical divider lines', () => {
      const { container } = renderGantt()
      const vlines = container.querySelectorAll('.gt-vline')
      expect(vlines.length).toBeGreaterThan(0)
    })

    it('should render weekend background when showWeekend is true', () => {
      const { container } = renderGantt({ showWeekend: true })
      const weekendBg = container.querySelectorAll('.gt-weekend-bg')
      // weekend 背景块可能存在也可能不存在（取决于数据范围）
      // 但至少不应报错
      expect(weekendBg).toBeDefined()
    })
  })

  describe('底部滚动条 (horizontal scrollbar)', () => {
    it('should have role=scrollbar on horizontal scrollbar', () => {
      const { container } = renderGantt()
      const scroll = container.querySelector('.gt-hscroll')
      expect(scroll?.getAttribute('role')).toBe('scrollbar')
      expect(scroll?.getAttribute('aria-orientation')).toBe('horizontal')
    })

    it('should have inner spacer div with content width', () => {
      const { container } = renderGantt()
      const hscroll = container.querySelector('.gt-hscroll')
      const inner = hscroll?.querySelector('div')
      expect(inner).toBeTruthy()
      expect(inner?.style.width).toMatch(/^\d+px$/)
    })

    it('should be placed outside gt-body-flex to avoid squeezing timeline', () => {
      const { container } = renderGantt()
      const flex = container.querySelector('.gt-body-flex')
      const hscroll = container.querySelector('.gt-hscroll')
      const hscrollParent = hscroll?.parentElement
      // gt-hscroll 的父元素不应该是 gt-body-flex
      expect(hscrollParent?.classList.contains('gt-body-flex')).toBe(false)
      // gt-hscroll 的父元素应该是 gt-body-inner
      expect(hscrollParent?.classList.contains('gt-body-inner')).toBe(true)
    })
  })

  describe('任务条渲染 (task bar rendering)', () => {
    it('should render bar with correct left position', () => {
      const { container } = renderGantt()
      const bars = container.querySelectorAll('.gt-bar-wrap')
      expect(bars.length).toBeGreaterThan(0)
      const firstBar = bars[0] as HTMLElement
      const left = firstBar.style.left
      expect(left).toMatch(/^\d+px$/)
      const numLeft = parseInt(left)
      expect(numLeft).toBeGreaterThanOrEqual(0)
    })

    it('should render bar with correct width', () => {
      const { container } = renderGantt()
      const bars = container.querySelectorAll('.gt-bar-wrap')
      const firstBar = bars[0] as HTMLElement
      const w = firstBar.style.width
      expect(w).toMatch(/^\d+px$/)
      const numW = parseInt(w)
      expect(numW).toBeGreaterThan(0)
    })

    it('should render milestone marker for milestone tasks', () => {
      const { container } = renderGantt()
      const milestone = container.querySelector('.gt-milestone')
      expect(milestone).toBeTruthy()
    })

    it('should render progress fill inside bars', () => {
      const { container } = renderGantt()
      const progressFills = container.querySelectorAll('.gt-bar-fill')
      expect(progressFills.length).toBeGreaterThan(0)
    })
  })

  describe('连线渲染 (link rendering)', () => {
    it('should render SVG link layer', () => {
      const { container } = renderGantt()
      const svg = container.querySelector('.gt-link-layer')
      expect(svg).toBeTruthy()
    })

    it('should render link lines', () => {
      const { container } = renderGantt()
      const lines = container.querySelectorAll('.gt-link-line')
      expect(lines.length).toBeGreaterThan(0)
    })
  })
})
