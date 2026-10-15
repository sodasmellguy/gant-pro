/**
 * React Demo — 演示 @gantt-pro/react 组件
 * 功能与 Vue demo 完全对齐
 */
import { useState, useCallback, useRef, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { GanttChart, type GanttRef, type GanttChartProps } from '@gantt-pro/react'
import type { GanttTask, GanttLink, ScaleType, HolidayItem } from '@gantt-pro/core'
import '@gantt-pro/react/style.css'
import './demo.css'
import { demoTasks, demoLinks } from './demo-data'

const holidays: HolidayItem[] = [
  { date: '2025-01-01', label: '元旦' },
  { date: '2025-01-29', label: '春节' },
  { date: '2025-04-04', label: '清明' },
  { date: '2025-05-01', label: '劳动节' },
  { date: '2025-06-01', label: '端午' },
  { date: '2025-10-01', label: '国庆' }
]

const scaleOptions: { value: ScaleType; label: string }[] = [
  { value: 'hour', label: '时' },
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' }
]

function findName(list: GanttTask[], id: string): string | null {
  for (const t of list) {
    if (t.id === id) return t.name
    if (t.children) {
      const r = findName(t.children, id)
      if (r) return r
    }
  }
  return null
}

function App() {
  const [data, setData] = useState<GanttTask[]>(() => JSON.parse(JSON.stringify(demoTasks)))
  const [links, setLinks] = useState<GanttLink[]>(() => [...demoLinks])
  const [scale, setScale] = useState<ScaleType>('day')
  const [dark, setDark] = useState(false)
  const [readonly, setReadonly] = useState(false)
  const [showBaseline, setShowBaseline] = useState(true)
  const [autoReschedule, setAutoReschedule] = useState(true)
  const [showCriticalPath, setShowCriticalPath] = useState(true)
  const [editable, setEditable] = useState(true)
  const [allowLink, setAllowLink] = useState(true)
  const [linkedResize, setLinkedResize] = useState(true)
  const [rowDraggable, setRowDraggable] = useState(true)
  const [showCheckbox, setShowCheckbox] = useState(true)
  const [showDivider, setShowDivider] = useState(true)
  const [resizableColumns, setResizableColumns] = useState(true)
  const [levelColor, setLevelColor] = useState(true)
  const [rowDblClick, setRowDblClick] = useState(true)
  const [contextMenu, setContextMenu] = useState(true)
  const [moveByUnit, setMoveByUnit] = useState(false)
  const [highlightDate, setHighlightDate] = useState(false)
  const [locale, setLocale] = useState<'zh-CN' | 'en-US'>('zh-CN')
  const [progressDecimal, setProgressDecimal] = useState(0)
  const [barAlignment, setBarAlignment] = useState<'left' | 'center' | 'right'>('center')
  const [search, setSearch] = useState('')
  const [filterOwner, setFilterOwner] = useState<string | null>(null)
  const [locateId, setLocateId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const logSeq = useRef(0)
  const ganttRef = useRef<GanttRef>(null)

  // ==================== 事件日志 ====================
  const log = useCallback((msg: string) => {
    logSeq.current++
    const entry = `[${String(logSeq.current).padStart(2, '0')}] ${msg}`
    setLogs(prev => [entry, ...prev].slice(0, 30))
  }, [])

  // ==================== 计算属性 ====================
  const owners = useMemo(() => {
    const set = new Set<string>()
    const walk = (list: GanttTask[]) => {
      for (const t of list) {
        if (t.owner) set.add(typeof t.owner === 'string' ? t.owner : t.owner.name)
        if (t.children) walk(t.children)
      }
    }
    walk(data)
    return [...set]
  }, [data])

  const leafTasks = useMemo(() => {
    const res: { id: string; name: string }[] = []
    const walk = (list: GanttTask[]) => {
      for (const t of list) {
        if (t.children?.length) walk(t.children)
        else res.push({ id: t.id, name: t.name })
      }
    }
    walk(data)
    return res
  }, [data])

  // ==================== 事件回调 ====================
  const handleDataChange = useCallback((d: GanttTask[]) => {
    setData(d)
  }, [])

  const handleLinkCreate = useCallback((p: { from: string; to: string }) => {
    const name = (id: string) => findName(data, id) ?? id
    setLinks(prev => [...prev, { from: p.from, to: p.to, type: 'fs' }])
    log(`新建依赖：${name(p.from)} → ${name(p.to)}`)
  }, [data, log])

  const handleTaskChange = useCallback((p: any) => {
    const f = (d?: string) => (d ? d.slice(5) : '—')
    if (p.mode === 'edit') {
      if (p.oldName !== p.task.name) log(`「${p.oldName}」重命名为「${p.task.name}」`)
      else log(`「${p.task.name}」进度 ${p.oldProgress}% → ${p.task.progress}%`)
      return
    }
    if (p.mode === 'progress') log(`「${p.task.name}」进度 ${p.oldProgress}% → ${p.task.progress}%`)
    else
      log(
        `「${p.task.name}」${p.mode === 'move' ? '移动' : p.mode === 'left' ? '左端调整' : '右端调整'} → ${f(p.task.startDate)} ~ ${f(p.task.endDate)}`
      )
  }, [log])

  const handleReschedule = useCallback((changes: any[]) => {
    const f = (d?: string) => (d ? d.slice(5) : '-')
    const lines = changes.map(
      (c: any) =>
        `「${c.task.name}」${f(c.oldStartDate)} ~ ${f(c.oldEndDate)} → ${f(c.task.startDate)} ~ ${f(c.task.endDate)}`
    )
    log(`依赖顺推 ${changes.length} 项：${lines.join('；')}`)
  }, [log])

  const handleRowMove = useCallback((p: any) => {
    log(`行排序：「${p.task.name}」从位置 ${p.fromIndex} 移至 ${p.toIndex}`)
  }, [log])

  const handleSelectionChange = useCallback((ids: string[]) => {
    log(`选中 ${ids.length} 项任务`)
  }, [log])

  // ==================== 操作方法 ====================
  const onLocate = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value || null
    setLocateId(id)
    if (id) ganttRef.current?.scrollToTask(id)
  }, [])

  const doUndo = useCallback(() => {
    // React 版 undo 不返回 entry 数组，用 onUndo 回调代替
    ganttRef.current?.undo()
    log('撤销操作')
  }, [log])

  const doRedo = useCallback(() => {
    ganttRef.current?.redo()
    log('重做操作')
  }, [log])

  const reset = useCallback(() => {
    setData(JSON.parse(JSON.stringify(demoTasks)))
    setLinks([...demoLinks])
    log('数据已重置')
  }, [log])

  // ==================== 构建 Props ====================
  const props: GanttChartProps = {
    data,
    onDataChange: handleDataChange,
    links,
    onLinksChange: setLinks,
    scale,
    onScaleChange: (s: ScaleType) => { setScale(s); log(`切换刻度：${s}`) },
    dark,
    readonly,
    showBaseline,
    autoReschedule,
    showCriticalPath,
    editable,
    allowLink,
    linkedResize,
    rowDraggable,
    showCheckbox,
    showDivider,
    resizableColumns,
    levelColor,
    rowDblClick,
    contextMenu,
    moveByUnit,
    highlightDate,
    filterOwner,
    holidays,
    locale,
    progressDecimal,
    barAlignment,
    search,
    emptyData: '暂无数据 😢',
    dateFormat: 'MM-DD',
    rowHeight: 38,
    barHeight: 24,
    showToday: true,
    zoomOnWheel: true,
    onTaskChange: handleTaskChange,
    onLinkCreate: handleLinkCreate,
    onReschedule: handleReschedule,
    onRowMove: handleRowMove,
    onSelectionChange: handleSelectionChange,
    onRowClick: (t: GanttTask) => log(`点击行：${t.name}`),
    onRowDblClick: (t: GanttTask) => log(`双击行：${t.name}`),
    onLinkClick: (l: GanttLink) => log(`点击依赖线：${l.from} → ${l.to}`),
    onExpand: (t: GanttTask, v: boolean) => log(`${v ? '展开' : '折叠'}：${t.name}`),
    onUndo: () => log('撤销：还原变更'),
    onRedo: () => log('重做：重新应用变更'),
    headerStyle: { bgColor: '', textColor: '' },
    bodyStyle: {},
    sliderIntoView: true,
    offScreenIndicator: true,
    theme: 'blue',
  }

  // ==================== 渲染 ====================
  return (
    <div className={`demo-app ${dark ? 'dark' : ''}`}>
      <header className="demo-header">
        <h1>Gantt Pro — React Demo</h1>
        <p>跨框架甘特图组件 · 任务树 / 拖拽调整 / 依赖连线 / 里程碑 / 多刻度 / 虚拟滚动 / 暗色主题</p>
      </header>

      <div className="demo-controls">
        {/* 刻度切换 */}
        <div className="demo-seg">
          {scaleOptions.map(s => (
            <button
              key={s.value}
              className={scale === s.value ? 'active' : ''}
              onClick={() => setScale(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 开关按钮 */}
        <button onClick={() => setDark(!dark)}>
          {dark ? '☀️ 亮色' : '🌙 暗色'}
        </button>
        <button onClick={() => setShowCriticalPath(!showCriticalPath)}>
          {showCriticalPath ? '隐藏关键路径' : '显示关键路径'}
        </button>
        <button onClick={() => setAutoReschedule(!autoReschedule)}>
          依赖顺推: {autoReschedule ? '开' : '关'}
        </button>
        <button onClick={() => setShowBaseline(!showBaseline)}>
          基准线: {showBaseline ? '开' : '关'}
        </button>
        <button onClick={() => setEditable(!editable)}>
          行内编辑: {editable ? '开' : '关'}
        </button>
        <button onClick={() => setRowDraggable(!rowDraggable)}>
          行拖拽: {rowDraggable ? '开' : '关'}
        </button>
        <button onClick={() => setContextMenu(!contextMenu)}>
          右键菜单: {contextMenu ? '开' : '关'}
        </button>

        {/* 复选框开关 */}
        <label className="demo-check">
          <input type="checkbox" checked={readonly} onChange={e => setReadonly(e.target.checked)} /> 只读
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={allowLink} onChange={e => setAllowLink(e.target.checked)} /> 允许建线
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={linkedResize} onChange={e => setLinkedResize(e.target.checked)} /> 父子联动
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={showCheckbox} onChange={e => setShowCheckbox(e.target.checked)} /> 复选框
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={showDivider} onChange={e => setShowDivider(e.target.checked)} /> 分隔线
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={resizableColumns} onChange={e => setResizableColumns(e.target.checked)} /> 列调宽
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={levelColor} onChange={e => setLevelColor(e.target.checked)} /> 层级色
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={rowDblClick} onChange={e => setRowDblClick(e.target.checked)} /> 行双击
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={moveByUnit} onChange={e => setMoveByUnit(e.target.checked)} /> 按单位移动
        </label>
        <label className="demo-check">
          <input type="checkbox" checked={highlightDate} onChange={e => setHighlightDate(e.target.checked)} /> 悬停高亮
        </label>

        {/* 下拉选择 */}
        <label className="demo-check">
          负责人
          <select className="demo-search" value={filterOwner ?? ''} onChange={e => setFilterOwner(e.target.value || null)}>
            <option value="">全部</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="demo-check">
          定位
          <select className="demo-search" value={locateId ?? ''} onChange={onLocate}>
            <option value="">选择任务…</option>
            {leafTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="demo-check">
          语言
          <select className="demo-search" value={locale} onChange={e => setLocale(e.target.value as 'zh-CN' | 'en-US')}>
            <option value="zh-CN">中文</option>
            <option value="en-US">English</option>
          </select>
        </label>
        <label className="demo-check">
          进度小数
          <select className="demo-search" value={progressDecimal} onChange={e => setProgressDecimal(Number(e.target.value))}>
            <option value={0}>0 位</option>
            <option value={1}>1 位</option>
            <option value={2}>2 位</option>
          </select>
        </label>
        <label className="demo-check">
          条形对齐
          <select className="demo-search" value={barAlignment} onChange={e => setBarAlignment(e.target.value as 'left' | 'center' | 'right')}>
            <option value="left">左</option>
            <option value="center">中</option>
            <option value="right">右</option>
          </select>
        </label>

        {/* 搜索 */}
        <input
          className="demo-search"
          type="text"
          placeholder="搜索任务…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* 操作按钮 */}
        <button onClick={() => ganttRef.current?.scrollToToday()}>今日</button>
        <button onClick={doUndo}>撤销</button>
        <button onClick={doRedo}>重做</button>
        <button onClick={() => ganttRef.current?.print()}>打印</button>
        <button onClick={reset}>重置数据</button>
      </div>

      <main className="demo-main" style={{ marginTop: 16, height: 560 }}>
        <GanttChart ref={ganttRef} {...props} />
      </main>

      <div className="demo-tips">
        💡 操作提示：拖动条形移动 · 拖两端缩放 · 悬停拖顶部圆点改进度 · 悬停右侧圆点拖到其他任务创建依赖 ·
        点击箭头/菱形图标折叠展开 · 时间区内 Ctrl + 滚轮缩放刻度 · 双击任务名称/进度单元格直接编辑 · 拖拽行排序 ·
        拖表头列宽边界调宽 · Checkbox 多选 · 父子联动缩放 · 右键菜单删除/添加依赖 · 切换语言英文刻度 · 悬停高亮 ·
        按单位移动 · 行双击 · 进度小数 · 条形对齐 · 搜索高亮 · 双击连线删除 · 打印 · 键盘导航(↑↓/Enter/Space)
      </div>

      <div className="demo-log">
        <div className="demo-log-title">事件日志</div>
        {logs.length === 0 ? (
          <div className="demo-log-empty">暂无事件，去拖动任务条试试</div>
        ) : (
          logs.map((l, i) => <div key={i} className="demo-log-item">{l}</div>)
        )}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
