/**
 * Demo 数据 — 与 React demo 同样的任务结构，方便对比
 */
import type { GanttTask, GanttLink } from '@gantt-pro/core'

function day(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 带时分的小时刻度日期 */
function dayTime(offset: number, h: number, m = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export const demoTasks: GanttTask[] = [
  {
    id: 'p1',
    name: '项目启动',
    children: [
      {
        id: 't1',
        name: '需求调研',
        startDate: day(-6),
        endDate: day(-2),
        baselineStart: day(-7),
        baselineEnd: day(-3),
        progress: 100,
        owner: { name: '张伟', color: '#f59e0b' }
      },
      {
        id: 't2',
        name: '可行性分析',
        startDate: day(-4),
        endDate: day(-1),
        baselineStart: day(-4),
        baselineEnd: day(-2),
        progress: 100,
        owner: '李娜'
      },
      { id: 't3', name: '立项评审', startDate: day(0), baselineStart: day(-1), milestone: true, owner: '李娜' }
    ]
  },
  {
    id: 'p2',
    name: '方案设计',
    children: [
      {
        id: 't4',
        name: '概要设计',
        startDate: day(1),
        endDate: day(6),
        baselineStart: day(0),
        baselineEnd: day(5),
        progress: 60,
        owner: { name: '王强', color: '#10b981' }
      },
      {
        id: 't5',
        name: '详细设计',
        startDate: day(5),
        endDate: day(11),
        baselineStart: day(4),
        baselineEnd: day(9),
        progress: 20,
        owner: '王强'
      },
      { id: 't6', name: '设计评审通过', startDate: day(12), baselineStart: day(11), milestone: true, owner: '李娜' }
    ]
  },
  {
    id: 'p3',
    name: '开发阶段',
    collapsed: false,
    children: [
      {
        id: 'p3-1',
        name: '前端开发',
        children: [
          {
            id: 't7',
            name: '页面搭建',
            startDate: dayTime(13, 9),
            endDate: dayTime(13, 18),
            baselineStart: dayTime(12, 9),
            baselineEnd: dayTime(12, 18),
            progress: 10,
            owner: { name: '赵敏', color: '#8b5cf6' }
          },
          {
            id: 't8',
            name: '接口联调',
            startDate: day(19),
            endDate: day(26),
            baselineStart: day(19),
            baselineEnd: day(25),
            progress: 0,
            owner: '赵敏'
          }
        ]
      },
      {
        id: 't9',
        name: '后端开发',
        startDate: day(13),
        endDate: day(28),
        baselineStart: day(12),
        baselineEnd: day(26),
        progress: 5,
        color: '#10b981',
        owner: '陈刚'
      },
      {
        id: 't10',
        name: '数据库设计与建表',
        startDate: day(13),
        endDate: day(17),
        baselineStart: day(13),
        baselineEnd: day(17),
        progress: 30,
        color: '#8b5cf6',
        owner: '陈刚'
      }
    ]
  },
  {
    id: 'p4',
    name: '测试与发布',
    children: [
      {
        id: 't11',
        name: '集成测试',
        startDate: day(29),
        endDate: day(35),
        baselineStart: day(27),
        baselineEnd: day(33),
        progress: 0,
        owner: '李娜'
      },
      {
        id: 't12',
        name: '回归测试',
        startDate: day(34),
        endDate: day(38),
        baselineStart: day(33),
        baselineEnd: day(37),
        progress: 0,
        owner: '李娜'
      },
      { id: 't13', name: '上线发布', startDate: day(40), baselineStart: day(38), milestone: true, owner: '张伟' }
    ]
  }
]

export const demoLinks: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },
  { from: 't2', to: 't3', type: 'fs' },
  { from: 't3', to: 't4', type: 'fs' },
  { from: 't4', to: 't5', type: 'ss' },
  { from: 't5', to: 't6', type: 'fs' },
  { from: 't6', to: 't7', type: 'fs' },
  { from: 't7', to: 't8', type: 'fs' },
  { from: 't8', to: 't11', type: 'ff' },
  { from: 't11', to: 't12', type: 'fs' },
  { from: 't12', to: 't13', type: 'fs' }
]
