/**
 * GanttEngine 单元测试
 *
 * 覆盖：数据初始化 / 字段映射 / 可见行 / 几何 / 拖拽（含 linkedResize、顺推、撤销）/
 * 展开折叠 / 编辑删除 / 事件系统 / 假日与层级色
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GanttEngine, type EngineOptions } from './ganttEngine'
import { BUILTIN_LABELS, type GanttTask, type GanttLink } from './types'

function makeOpts(overrides: Partial<EngineOptions> = {}): EngineOptions {
  return {
    scale: 'day',
    rowHeight: 36,
    barHeight: 24,
    readonly: false,
    allowLink: true,
    showBaseline: false,
    autoReschedule: false,
    filterOwner: null,
    showCriticalPath: false,
    hourWidth: 24,
    linkedResize: false,
    rowDraggable: false,
    fieldMap: {},
    holidays: [],
    levelColor: false,
    links: [],
    snap: true,
    showExpectedProgress: false,
    rangeStart: null,
    rangeEnd: null,
    moveByUnit: false,
    progressDecimal: 0,
    labels: BUILTIN_LABELS['zh-CN'],
    ...overrides
  }
}

function makeEngine(data: GanttTask[], overrides: Partial<EngineOptions> = {}) {
  return new GanttEngine(data, makeOpts(overrides))
}

/** 派发携带 clientX 的窗口指针事件（模拟拖拽） */
function firePointer(name: string, x: number) {
  const ev = new Event(name) as any
  ev.clientX = x
  window.dispatchEvent(ev)
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
    children: [
      { id: 't4', name: '任务D', startDate: '2025-01-12', endDate: '2025-01-20', progress: 0 }
    ]
  }
]

const sampleLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 't3', type: 'fs' },
  { from: 't3', to: 't4', type: 'fs' }
]

beforeEach(() => {
  // jsdom 未实现 elementFromPoint，连线起草落点判定需要
  ;(document as any).elementFromPoint = vi.fn(() => null)
})

describe('GanttEngine - 初始化与数据', () => {
  it('should clone input data', () => {
    const data = JSON.parse(JSON.stringify(sampleTasks))
    const engine = makeEngine(data)
    engine.data.value[0].name = 'changed'
    expect(data[0].name).toBe('项目阶段一')
  })

  it('should collect initial collapsed state', () => {
    const engine = makeEngine([{ id: 'p1', name: 'p', collapsed: true, children: [{ id: 't1', name: 't' }] }])
    expect(engine.isCollapsed('p1')).toBe(true)
    expect(engine.flatRows).toHaveLength(1)
  })

  it('setData should replace data and reset history', () => {
    const engine = makeEngine(sampleTasks)
    engine.editTask('t1', { name: 'x' })
    expect(engine.canUndo).toBe(true)
    engine.setData([{ id: 'a', name: 'a' }])
    expect(engine.canUndo).toBe(false)
    expect(engine.findTask('t1')).toBeNull()
    expect(engine.findTask('a')).toBeTruthy()
  })

  it('taskField should support field mapping', () => {
    const engine = makeEngine(
      [{ id: 'w1', name: 'W', startDate: '2025-01-01', endDate: '2025-01-02' }],
      { fieldMap: { id: 'wid', name: 'wname' } }
    )
    const t = { wid: 'x1', wname: 'mapped' } as GanttTask
    expect(engine.taskField(t, 'id')).toBe('x1')
    expect(engine.taskField(t, 'name')).toBe('mapped')
  })
})

describe('GanttEngine - 可见行', () => {
  it('flatRows should flatten with depth and summary flags', () => {
    const engine = makeEngine(sampleTasks)
    const rows = engine.flatRows
    expect(rows).toHaveLength(6)
    expect(rows[0].task.id).toBe('p1')
    expect(rows[0].depth).toBe(0)
    expect(rows[0].summary).toBe(true)
    expect(rows[1].task.id).toBe('t1')
    expect(rows[1].depth).toBe(1)
    expect(rows[1].summary).toBe(false)
    expect(rows[0].index).toBe(0)
    expect(rows[5].task.id).toBe('t4')
  })

  it('flatRows should respect filterOwner', () => {
    const data: GanttTask[] = [
      { id: 'p1', name: 'p', children: [
        { id: 't1', name: 'a', owner: 'alice' },
        { id: 't2', name: 'b', owner: 'bob' }
      ] }
    ]
    const engine = makeEngine(data, { filterOwner: 'alice' })
    const rows = engine.flatRows
    expect(rows.map(r => r.task.id)).toEqual(['p1', 't1'])
  })

  it('rowsTotalHeight = rows * rowHeight', () => {
    const engine = makeEngine(sampleTasks)
    expect(engine.rowsTotalHeight).toBe(6 * 36)
  })
})

describe('GanttEngine - 展开折叠', () => {
  it('toggleExpand should toggle and emit event', () => {
    const engine = makeEngine(sampleTasks)
    const events: [GanttTask, boolean][] = []
    engine.onExpand((t, v) => events.push([t, v]))
    engine.toggleExpand(engine.findTask('p1')!)
    expect(engine.isCollapsed('p1')).toBe(true)
    // p1 折叠后仍剩 p2 与 t4 两行
    expect(engine.flatRows).toHaveLength(3)
    engine.toggleExpand(engine.findTask('p1')!)
    expect(engine.isCollapsed('p1')).toBe(false)
    expect(engine.flatRows).toHaveLength(6)
    expect(events).toHaveLength(2)
    expect(events[0][1]).toBe(false) // willExpand = false
    expect(events[1][1]).toBe(true)
  })

  it('expandAll should expand / collapse all', () => {
    const engine = makeEngine(sampleTasks)
    engine.expandAll(false)
    expect(engine.flatRows).toHaveLength(2)
    engine.expandAll(true)
    expect(engine.flatRows).toHaveLength(6)
  })
})

describe('GanttEngine - 日期范围与坐标', () => {
  it('chartStart/chartEnd should honor explicit range', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    expect(engine.chartStart.getTime()).toBe(new Date(2025, 0, 1).getTime())
    expect(engine.chartEnd.getTime()).toBe(new Date(2025, 0, 31).getTime())
  })

  it('contentWidth = totalDays * pxPerDay', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    expect(engine.totalDays).toBe(31)
    expect(engine.contentWidth).toBe(Math.round(31 * 34))
  })

  it('timeToX / xToTime roundtrip', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const x = engine.timeToX(new Date(2025, 0, 11).getTime())
    expect(x).toBe(10 * 34)
    const back = engine.xToTime(x)
    expect(new Date(back).getDate()).toBe(11)
  })

  it('timeToX should use hours in hour scale', () => {
    const engine = makeEngine(sampleTasks, {
      scale: 'hour', hourWidth: 24,
      rangeStart: '2025-01-01', rangeEnd: '2025-01-02'
    })
    expect(engine.pxPerDay).toBe(576)
    expect(engine.timeToX(new Date(2025, 0, 1, 3).getTime())).toBe(3 * 24)
  })

  it('todayX should be -1 when today out of range', () => {
    const engine = makeEngine([{ id: 't1', name: 'old', startDate: '2020-01-01', endDate: '2020-01-10' }])
    expect(engine.todayX).toBe(-1)
  })

  it('pxPerDay should vary by scale', () => {
    expect(makeEngine([], { scale: 'week' }).pxPerDay).toBe(11)
    expect(makeEngine([], { scale: 'month' }).pxPerDay).toBe(3.2)
    expect(makeEngine([], { scale: 'quarter' }).pxPerDay).toBe(1.15)
    expect(makeEngine([], { scale: 'year' }).pxPerDay).toBe(0.3)
  })
})

describe('GanttEngine - 刻度与假日', () => {
  it('bottomTicks for day scale covers all days with weekend flag', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-06', rangeEnd: '2025-01-12' })
    const ticks = engine.bottomTicks
    expect(ticks).toHaveLength(7)
    expect(ticks[0].label).toBe('6')
    expect(ticks[0].weekend).toBe(false) // 2025-01-06 周一
    expect(ticks[5].weekend).toBe(true)  // 2025-01-11 周六
  })

  it('weekendCols only for day/hour scale', () => {
    const day = makeEngine(sampleTasks, { rangeStart: '2025-01-06', rangeEnd: '2025-01-12' })
    expect(day.weekendCols.length).toBe(2)
    const week = makeEngine(sampleTasks, { scale: 'week', rangeStart: '2025-01-06', rangeEnd: '2025-01-12' })
    expect(week.weekendCols).toHaveLength(0)
  })

  it('holidayCols should map holidays within range', () => {
    const engine = makeEngine(sampleTasks, {
      rangeStart: '2025-01-01', rangeEnd: '2025-01-31',
      holidays: [
        { date: '2025-01-01', color: '#f00', label: '元旦' },
        { date: '2025-03-01', label: '范围外' }
      ]
    })
    const cols = engine.holidayCols
    expect(cols).toHaveLength(1)
    expect(cols[0].left).toBe(0)
    expect(cols[0].width).toBe(34)
    expect(cols[0].color).toBe('#f00')
    expect(cols[0].label).toBe('元旦')
  })

  it('levelBgColor palette selection', () => {
    expect(makeEngine([]).levelBgColor(0)).toBe('transparent')
    expect(makeEngine([], { levelColor: true }).levelBgColor(0)).toBe('var(--gt-level-0)')
    const custom = makeEngine([], { levelColor: ['#f00', '#0f0'] })
    expect(custom.levelBgColor(0)).toBe('#f00')
    expect(custom.levelBgColor(1)).toBe('#0f0')
    expect(custom.levelBgColor(2)).toBe('#f00')
  })
})

describe('GanttEngine - 条形几何', () => {
  it('geoms should compute summary extremes and milestone width', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const g = engine.geoms
    const p1 = g.get('p1')!
    expect(p1.summary).toBe(true)
    expect(p1.x).toBe(0) // 子树最早 01-01
    expect(p1.w).toBe(10 * 34) // 子树最晚 01-10（里程碑不延伸父条，与参考实现一致）
    const t3 = g.get('t3')!
    expect(t3.milestone).toBe(true)
    expect(t3.w).toBe(34)
    expect(t3.x).toBe(10 * 34)
  })

  it('geoms should include segments and expectedX', () => {
    const engine = makeEngine([
      {
        id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-10', progress: 50,
        expectedProgress: 60,
        segments: [{ startDate: '2025-01-03', endDate: '2025-01-05', progress: 80, color: '#abc' }]
      }
    ], { showExpectedProgress: true, rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const g = engine.geoms.get('t1')!
    expect(g.segments).toHaveLength(1)
    expect(g.segments![0].x).toBe(2 * 34)
    expect(g.segments![0].w).toBe(3 * 34)
    expect(g.segments![0].color).toBe('#abc')
    expect(g.expectedX).toBeCloseTo(g.x + g.w * 0.6)
  })

  it('geoms baseline should use subtree extremes for summary rows', () => {
    const engine = makeEngine([
      {
        id: 'p1', name: 'p',
        baselineStart: '2025-01-01', baselineEnd: '2025-01-08',
        children: [
          { id: 't1', name: 'a', startDate: '2025-01-02', endDate: '2025-01-06', baselineStart: '2025-01-02', baselineEnd: '2025-01-04' }
        ]
      }
    ], { showBaseline: true, rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const p = engine.geoms.get('p1')!
    expect(p.baseline).toBe(true)
    // 汇总行基准取子树极值（01-02~01-04），不使用自身 baseline
    expect(p.bx).toBe(34)
    expect(p.bw).toBe(3 * 34)
    const t = engine.geoms.get('t1')!
    expect(t.baseline).toBe(true)
    expect(t.bw).toBe(3 * 34)
    expect(t.overdue).toBe(true) // 实际 01-06 晚于计划 01-04
  })
})

describe('GanttEngine - 查找与编辑', () => {
  it('findTask / findAncestors', () => {
    const engine = makeEngine(sampleTasks)
    expect(engine.findTask('t2')!.name).toBe('任务B')
    expect(engine.findTask('nope')).toBeNull()
    const anc = engine.findAncestors('t1')
    expect(anc).toHaveLength(1)
    expect(anc[0].id).toBe('p1')
    expect(engine.findAncestors('p1')).toHaveLength(0)
    const deep: GanttTask[] = [{ id: 'a', name: 'a', children: [{ id: 'b', name: 'b', children: [{ id: 'c', name: 'c' }] }] }]
    const anc2 = makeEngine(deep).findAncestors('c')
    expect(anc2.map(t => t.id)).toEqual(['b', 'a'])
  })

  it('summaryProgress should average children', () => {
    const engine = makeEngine(sampleTasks)
    expect(engine.summaryProgress(engine.findTask('p1')!)).toBe(50)
  })

  it('editTask should NOT clamp progress (UI 层负责)', () => {
    const engine = makeEngine(sampleTasks)
    engine.editTask('t1', { progress: 150 })
    expect(engine.findTask('t1')!.progress).toBe(150)
  })

  it('editTask should record history, emit commit and support undo', () => {
    const engine = makeEngine(sampleTasks)
    const commits: any[] = []
    engine.onCommit(p => commits.push(p))
    engine.editTask('t1', { name: '新名称' })
    expect(engine.findTask('t1')!.name).toBe('新名称')
    expect(commits).toHaveLength(1)
    expect(commits[0].mode).toBe('edit')
    expect(commits[0].oldName).toBe('任务A')
    expect(engine.canUndo).toBe(true)
    engine.undo()
    expect(engine.findTask('t1')!.name).toBe('任务A')
    expect(engine.canRedo).toBe(true)
    engine.redo()
    expect(engine.findTask('t1')!.name).toBe('新名称')
  })

  it('deleteTask should remove task and related links', () => {
    const engine = makeEngine(sampleTasks, { links: [...sampleLinks, { from: 't1', to: 't4' }] })
    const commits: any[] = []
    engine.onCommit(p => commits.push(p))
    engine.deleteTask('t1')
    expect(engine.findTask('t1')).toBeNull()
    expect(engine.options.value.links!.some(l => l.from === 't1' || l.to === 't1')).toBe(false)
    expect(commits).toHaveLength(1)
    // 与参考实现一致：历史仅记录字段补丁，undo 无法复活已删除的任务
    engine.undo()
    expect(engine.canRedo).toBe(true)
    expect(engine.findTask('t1')).toBeNull()
  })
})

describe('GanttEngine - 行排序', () => {
  it('moveRow should splice within siblings and emit rowMove', () => {
    const engine = makeEngine(sampleTasks)
    const moves: any[] = []
    engine.onRowMove(p => moves.push(p))
    const result = engine.moveRow('t1', 2)
    expect(result).toEqual({ fromIndex: 0, toIndex: 1, parentId: 'p1' })
    const kids = engine.findTask('p1')!.children!
    expect(kids.map(t => t.id)).toEqual(['t2', 't1', 't3'])
    // 同索引返回 null
    expect(engine.moveRow('t1', 1)).toBeNull()
  })

  it('moveRow should not move across parents (仅同级内)', () => {
    const engine = makeEngine(sampleTasks)
    engine.moveRow('t1', 1)
    expect(engine.findTask('p2')!.children![0].id).toBe('t4')
  })
})

describe('GanttEngine - 拖拽', () => {
  it('dragging getter should reflect drag state', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    expect(engine.dragging).toBe(false)
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    expect(engine.dragging).toBe(true)
    firePointer('pointerup', 100)
    expect(engine.dragging).toBe(false)
  })

  it('move drag with snap should shift by whole days', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05', progress: 50 }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const commits: any[] = []
    engine.onCommit(p => commits.push(p))
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 100 + 34) // 1 天
    firePointer('pointerup', 100 + 34)
    const t = engine.findTask('t1')!
    expect(t.startDate).toBe('2025-01-02')
    expect(t.endDate).toBe('2025-01-06')
    expect(commits).toHaveLength(1)
    expect(commits[0].oldStartDate).toBe('2025-01-01')
    engine.undo()
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-01')
  })

  it('click without movement should not commit', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const commits: any[] = []
    engine.onCommit(p => commits.push(p))
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointerup', 100)
    expect(commits).toHaveLength(0)
    expect(engine.canUndo).toBe(false)
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-01')
  })

  it('progress drag should be relative to original progress', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05', progress: 50 }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    // 条宽 = 5 天 * 34 = 170px，拖 85px = +50%
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'progress')
    firePointer('pointermove', 185)
    firePointer('pointerup', 185)
    expect(engine.findTask('t1')!.progress).toBe(100)
  })

  it('left/right resize with bounds', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'right')
    firePointer('pointermove', 134)
    firePointer('pointerup', 134)
    expect(engine.findTask('t1')!.endDate).toBe('2025-01-06')

    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'left')
    firePointer('pointermove', 66)
    firePointer('pointerup', 66)
    // 左拖边界只受 origEnd 约束，起点可以拖到范围之前
    expect(engine.findTask('t1')!.startDate).toBe('2024-12-31')
  })

  it('hour scale drag should shift by hours', () => {
    const engine = makeEngine(
      [{ id: 't1', name: 'a', startDate: '2025-01-01T00:00', endDate: '2025-01-01T05:00' }],
      { scale: 'hour', hourWidth: 24 }
    )
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 148) // 48px = 2 小时
    firePointer('pointerup', 148)
    const t = engine.findTask('t1')!
    expect(t.startDate).toBe('2025-01-01T02:00')
    expect(t.endDate).toBe('2025-01-01T07:00')
  })

  it('milestone without endDate should be draggable', () => {
    const engine = makeEngine(
      [{ id: 'm1', name: 'm', startDate: '2025-01-11', milestone: true }],
      { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' }
    )
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('m1')!, 'move')
    firePointer('pointermove', 134)
    firePointer('pointerup', 134)
    expect(engine.findTask('m1')!.startDate).toBe('2025-01-12')
  })

  it('summary rows should not be draggable', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const commits: any[] = []
    engine.onCommit(p => commits.push(p))
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('p1')!, 'move')
    firePointer('pointermove', 234)
    firePointer('pointerup', 234)
    expect(commits).toHaveLength(0)
    expect(engine.findTask('p1')!.startDate).toBeUndefined()
  })

  it('linkedResize should extend ancestors after leaf drag', () => {
    const engine = makeEngine([
      {
        id: 'p1', name: 'p', startDate: '2025-01-01', endDate: '2025-01-03',
        children: [{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-03' }]
      }
    ], { linkedResize: true, rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 168) // +2 天
    firePointer('pointerup', 168)
    expect(engine.findTask('t1')!.endDate).toBe('2025-01-05')
    // 父条按子树极值整体重算（01-03 ~ 01-05）
    expect(engine.findTask('p1')!.startDate).toBe('2025-01-03')
    expect(engine.findTask('p1')!.endDate).toBe('2025-01-05')
    // 一次 undo 同时恢复父与子
    engine.undo()
    expect(engine.findTask('t1')!.endDate).toBe('2025-01-03')
    expect(engine.findTask('p1')!.endDate).toBe('2025-01-03')
  })

  it('autoReschedule should push successors and emit reschedule', () => {
    const engine = makeEngine([
      { id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' },
      { id: 't2', name: 'b', startDate: '2025-01-06', endDate: '2025-01-10' },
      { id: 't3', name: 'c', startDate: '2025-01-11', endDate: '2025-01-15' }
    ], { autoReschedule: true, links: sampleLinks, rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    const reschedules: any[] = []
    engine.onReschedule(c => reschedules.push(c))
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 168) // +2 天 → t1: 01-03~01-07
    firePointer('pointerup', 168)
    expect(engine.findTask('t1')!.endDate).toBe('2025-01-07')
    // t2 顺延 2 天、t3 顺延 2 天
    expect(engine.findTask('t2')!.startDate).toBe('2025-01-08')
    expect(engine.findTask('t3')!.startDate).toBe('2025-01-13')
    expect(reschedules.length).toBeGreaterThan(0)
    // 顺推历史独立成条：第一次 undo 恢复顺推，第二次恢复拖拽
    engine.undo()
    expect(engine.findTask('t2')!.startDate).toBe('2025-01-06')
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-03')
    engine.undo()
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-01')
  })

  it('second startDrag during drag should be ignored', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }], { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 168)
    // 拖拽中再次发起（应被防重入挡掉）
    engine.startDrag({ clientX: 500, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointerup', 168)
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-03')
  })

  it('readonly engine should reject drag', () => {
    const engine = makeEngine([{ id: 't1', name: 'a', startDate: '2025-01-01', endDate: '2025-01-05' }], { readonly: true })
    engine.startDrag({ clientX: 100, preventDefault() {} } as any as PointerEvent, engine.findTask('t1')!, 'move')
    firePointer('pointermove', 168)
    firePointer('pointerup', 168)
    expect(engine.findTask('t1')!.startDate).toBe('2025-01-01')
  })
})

describe('GanttEngine - 连线起草', () => {
  it('startLinkDraft should create draft and finish on pointerup', () => {
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    engine.setContentEl(document.createElement('div'))
    engine.startLinkDraft({ clientX: 100, clientY: 100, preventDefault() {}, stopPropagation() {} } as any as PointerEvent, engine.findTask('t1')!)
    expect(engine.linkDraftLine).not.toBeNull()
    expect(engine.linkDraftLine!.fromId).toBe('t1')
    firePointer('pointerup', 200)
    expect(engine.linkDraftLine).toBeNull()
  })

  it('linkCreate should fire when dropped on a task bar', () => {
    ;(document as any).elementFromPoint = vi.fn(() => ({ closest: () => ({ dataset: { taskId: 't2' } }) }))
    const engine = makeEngine(sampleTasks, { rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    engine.setContentEl(document.createElement('div'))
    const created: any[] = []
    engine.onLinkCreate(p => created.push(p))
    engine.startLinkDraft({ clientX: 100, clientY: 100, preventDefault() {}, stopPropagation() {} } as any as PointerEvent, engine.findTask('t1')!)
    firePointer('pointerup', 200)
    expect(created).toEqual([{ from: 't1', to: 't2' }])
  })

  it('startLinkDraft should be rejected in readonly or when allowLink=false', () => {
    const ro = makeEngine(sampleTasks, { readonly: true })
    ro.startLinkDraft({ clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} } as any as PointerEvent, ro.findTask('t1')!)
    expect(ro.linkDraftLine).toBeNull()
    const noLink = makeEngine(sampleTasks, { allowLink: false })
    noLink.startLinkDraft({ clientX: 0, clientY: 0, preventDefault() {}, stopPropagation() {} } as any as PointerEvent, noLink.findTask('t1')!)
    expect(noLink.linkDraftLine).toBeNull()
  })
})

describe('GanttEngine - 事件系统与销毁', () => {
  it('on() should return unsubscribe', () => {
    const engine = makeEngine(sampleTasks)
    const calls: string[] = []
    const off = engine.onExpand(() => calls.push('x'))
    off()
    engine.toggleExpand(engine.findTask('p1')!)
    expect(calls).toHaveLength(0)
  })

  it('emitLinkClick / emitLinkDblClick', () => {
    const engine = makeEngine(sampleTasks)
    const link = { from: 't1', to: 't2' }
    const clicked: any[] = []
    engine.onLinkClick(l => clicked.push(l))
    engine.emitLinkClick(link)
    expect(clicked).toEqual([link])
  })

  it('destroy should clear listeners and history', () => {
    const engine = makeEngine(sampleTasks)
    engine.editTask('t1', { name: 'x' })
    engine.destroy()
    expect(engine.canUndo).toBe(false)
    expect(engine.dragging).toBe(false)
  })

  it('criticalIds should respect showCriticalPath flag', () => {
    const off = makeEngine(sampleTasks, { links: sampleLinks, showCriticalPath: false })
    expect(off.criticalIds.size).toBe(0)
    const on = makeEngine(sampleTasks, { links: sampleLinks, showCriticalPath: true })
    expect(on.criticalIds.size).toBeGreaterThan(0)
  })

  it('linkPaths should skip missing endpoints', () => {
    const engine = makeEngine(sampleTasks, { links: [...sampleLinks, { from: 'ghost', to: 't2' }], rangeStart: '2025-01-01', rangeEnd: '2025-01-31' })
    expect(engine.linkPaths).toHaveLength(3)
    expect(engine.linkPaths[0].key).toBe('t1>t2:fs')
  })
})
