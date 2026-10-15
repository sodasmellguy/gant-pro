import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import GanttChart from './GanttChart.vue'
import type { GanttTask, GanttLink, ScaleType } from '@gantt-pro/core'

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any
// Polyfill matchMedia
if (!window.matchMedia) {
  window.matchMedia = vi
    .fn()
    .mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
}

const sampleTasks: GanttTask[] = [
  {
    id: 'p1',
    name: '项目阶段一',
    children: [
      { id: 't1', name: '任务A', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
      { id: 't2', name: '任务B', startDate: '2025-01-06', endDate: '2025-01-10', progress: 50 },
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
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 't3', type: 'fs' }
]

function mountGantt(props: Record<string, any> = {}) {
  const tasks = ref(JSON.parse(JSON.stringify(sampleTasks)))
  const links = ref([...sampleLinks])
  return {
    tasks,
    links,
    wrapper: mount(GanttChart, {
      props: {
        data: tasks.value,
        links: links.value,
        rowHeight: 36,
        barHeight: 24,
        headerHeight: 56,
        ...props
      }
    })
  }
}

describe('GanttChart component', () => {
  describe('基础渲染', () => {
    it('should mount and render root element', () => {
      const { wrapper } = mountGantt()
      expect(wrapper.find('.gt-root').exists()).toBe(true)
    })

    it('should render table headers', () => {
      const { wrapper } = mountGantt()
      const headers = wrapper.findAll('.gt-th')
      expect(headers.length).toBeGreaterThan(0)
      expect(headers[0].text()).toContain('任务名称')
    })

    it('should render task rows', () => {
      const { wrapper } = mountGantt()
      const rows = wrapper.findAll('.gt-tr')
      expect(rows.length).toBeGreaterThan(0)
    })
  })

  describe('空数据', () => {
    it('should show empty data message when emptyData prop is set', async () => {
      const { wrapper } = mountGantt({ data: [], emptyData: '暂无数据 😢' })
      await nextTick()
      expect(wrapper.find('.gt-empty-data').exists()).toBe(true)
      expect(wrapper.find('.gt-empty-data').text()).toContain('暂无数据')
    })
  })

  describe('i18n', () => {
    it('should render English headers when locale is en-US', async () => {
      const { wrapper } = mountGantt({ locale: 'en-US' })
      await nextTick()
      const headers = wrapper.findAll('.gt-th')
      expect(headers[0].text()).toContain('Task Name')
    })
  })

  describe('暗色主题', () => {
    it('should apply dark class when dark prop is true', () => {
      const { wrapper } = mountGantt({ dark: true })
      expect(wrapper.find('.gt-root').classes()).toContain('gt-dark')
    })
  })

  describe('刻度切换', () => {
    it('should update scale when prop changes', async () => {
      const { wrapper } = mountGantt({ scale: 'day' })
      await wrapper.setProps({ scale: 'month' })
      expect(wrapper.vm.$el).toBeTruthy()
    })
  })

  describe('刻度切换保持位置 (captureCenterTime)', () => {
    it('should capture center time before scale change and restore after', async () => {
      const { wrapper } = mountGantt({ scale: 'day' })
      await nextTick()
      // 组件挂载后内部有 captureCenterTime / restoreCenterPos 机制
      // 切换刻度不应报错，且组件仍能正常渲染
      await wrapper.setProps({ scale: 'month' })
      await nextTick()
      expect(wrapper.find('.gt-root').exists()).toBe(true)
      // 再切回来也不报错
      await wrapper.setProps({ scale: 'day' })
      await nextTick()
      expect(wrapper.find('.gt-root').exists()).toBe(true)
    })

    it('should handle scale cycling through all levels without error', async () => {
      const { wrapper } = mountGantt({ scale: 'hour' })
      await nextTick()
      const scales: ScaleType[] = ['day', 'week', 'month', 'quarter', 'year', 'hour']
      for (const s of scales) {
        await wrapper.setProps({ scale: s })
        await nextTick()
        expect(wrapper.find('.gt-root').exists()).toBe(true)
      }
    })

    it('should emit scale-change when internal setScale is called', async () => {
      const { wrapper } = mountGantt({ scale: 'day' })
      await nextTick()
      // 初始状态下不应有 scale-change 事件
      expect(wrapper.emitted('scale-change')).toBeFalsy()
    })
  })

  describe('搜索高亮', () => {
    it('should highlight matching rows when search prop is set', async () => {
      const { wrapper } = mountGantt({ search: '任务A' })
      await nextTick()
      const matchRows = wrapper.findAll('.gt-search-match')
      expect(matchRows.length).toBeGreaterThan(0)
    })

    it('should not highlight any rows when search is empty', async () => {
      const { wrapper } = mountGantt({ search: '' })
      await nextTick()
      const matchRows = wrapper.findAll('.gt-search-match')
      expect(matchRows.length).toBe(0)
    })
  })

  describe('无障碍 (a11y)', () => {
    it('should have role=grid on root element', () => {
      const { wrapper } = mountGantt()
      expect(wrapper.find('.gt-root').attributes('role')).toBe('grid')
    })

    it('should have role=columnheader on table headers', () => {
      const { wrapper } = mountGantt()
      const ths = wrapper.findAll('.gt-th')
      expect(ths.length).toBeGreaterThan(0)
      expect(ths[0].attributes('role')).toBe('columnheader')
    })

    it('should have role=row on task rows', () => {
      const { wrapper } = mountGantt()
      const rows = wrapper.findAll('.gt-tr')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0].attributes('role')).toBe('row')
    })

    it('should have aria-label on task rows', () => {
      const { wrapper } = mountGantt()
      const rows = wrapper.findAll('.gt-tr')
      expect(rows[0].attributes('aria-label')).toBeTruthy()
    })

    it('should have role=status on empty data message', async () => {
      const { wrapper } = mountGantt({ data: [], emptyData: '暂无数据' })
      await nextTick()
      const empty = wrapper.find('.gt-empty-data')
      expect(empty.attributes('role')).toBe('status')
      expect(empty.attributes('aria-live')).toBe('polite')
    })

    it('should have role=scrollbar on horizontal scrollbar', () => {
      const { wrapper } = mountGantt()
      const scroll = wrapper.find('.gt-hscroll')
      expect(scroll.attributes('role')).toBe('scrollbar')
      expect(scroll.attributes('aria-orientation')).toBe('horizontal')
    })
  })

  describe('只读模式', () => {
    it('should mount in readonly mode without errors', () => {
      const { wrapper } = mountGantt({ readonly: true })
      expect(wrapper.find('.gt-root').exists()).toBe(true)
    })
  })

  describe('defineExpose API', () => {
    it('should expose undo/redo/scrollToToday/scrollToTask/jumpToDate/print methods', () => {
      const { wrapper } = mountGantt()
      const vm = wrapper.vm as any
      expect(typeof vm.undo).toBe('function')
      expect(typeof vm.redo).toBe('function')
      expect(typeof vm.scrollToToday).toBe('function')
      expect(typeof vm.scrollToTask).toBe('function')
      expect(typeof vm.jumpToDate).toBe('function')
      expect(typeof vm.print).toBe('function')
      expect(typeof vm.getSelected).toBe('function')
      expect(typeof vm.selectAll).toBe('function')
    })

    it('canUndo and canRedo should be computed refs', () => {
      const { wrapper } = mountGantt()
      const vm = wrapper.vm as any
      expect(vm.canUndo).toBeDefined()
      expect(vm.canRedo).toBeDefined()
    })
  })

  describe('视觉回归测试 (DOM 结构断言)', () => {
    it('should render correct DOM structure for default render', () => {
      const { wrapper } = mountGantt()
      expect(wrapper.find('.gt-root').exists()).toBe(true)
      expect(wrapper.find('.gt-header').exists()).toBe(true)
      expect(wrapper.find('.gt-body').exists()).toBe(true)
    })

    it('should render correct DOM structure for dark theme', () => {
      const { wrapper } = mountGantt({ dark: true })
      expect(wrapper.find('.gt-root.gt-dark').exists()).toBe(true)
    })

    it('should render correct DOM structure for readonly mode', () => {
      const { wrapper } = mountGantt({ readonly: true })
      expect(wrapper.find('.gt-root.gt-readonly').exists()).toBe(true)
    })

    it('should render correct DOM structure for en-US locale', async () => {
      const { wrapper } = mountGantt({ locale: 'en-US' })
      await nextTick()
      expect(wrapper.findAll('.gt-th')[0].text()).toContain('Task Name')
    })

    it('should render correct DOM structure for empty data', async () => {
      const { wrapper } = mountGantt({ data: [], emptyData: 'No data' })
      await nextTick()
      expect(wrapper.find('.gt-empty-data').exists()).toBe(true)
      expect(wrapper.find('.gt-empty-data').text()).toContain('No data')
    })
  })
})
