<script setup lang="ts">
import { ref, computed } from 'vue'
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink, ScaleType, HolidayItem } from '@gantt-pro/core'

// ==================== 响应式状态 ====================
const tasks = ref<GanttTask[]>(JSON.parse(JSON.stringify(demoTasks)))
const links = ref<GanttLink[]>([...demoLinks])
const scale = ref<ScaleType>('day')
const dark = ref(false)
const readonly = ref(false)
const showBaseline = ref(true)
const autoReschedule = ref(true)
const showCriticalPath = ref(true)
const editable = ref(true)
const allowLink = ref(true)
const linkedResize = ref(true)
const rowDraggable = ref(true)
const showCheckbox = ref(true)
const showDivider = ref(true)
const resizableColumns = ref(true)
const levelColor = ref(true)
const rowDblClick = ref(true)
const contextMenu = ref(true)
const moveByUnit = ref(false)
const highlightDate = ref(false)
const locale = ref<'zh-CN' | 'en-US'>('zh-CN')
const progressDecimal = ref(0)
const barAlignment = ref<'left' | 'center' | 'right'>('center')
const searchText = ref('')
const ganttRef = ref()
const locateId = ref<string | null>(null)

const holidays = ref<HolidayItem[]>([
  { date: '2025-01-01', label: '元旦' },
  { date: '2025-01-29', label: '春节' },
  { date: '2025-04-04', label: '清明' },
  { date: '2025-05-01', label: '劳动节' },
  { date: '2025-06-01', label: '端午' },
  { date: '2025-10-01', label: '国庆' }
])

// ==================== 计算属性 ====================
const owners = computed(() => {
  const set = new Set<string>()
  const walk = (list: GanttTask[]) => {
    for (const t of list) {
      if (t.owner) set.add(typeof t.owner === 'string' ? t.owner : t.owner.name)
      if (t.children) walk(t.children)
    }
  }
  walk(tasks.value)
  return [...set]
})

const leafTasks = computed(() => {
  const res: { id: string; name: string }[] = []
  const walk = (list: GanttTask[]) => {
    for (const t of list) {
      if (t.children?.length) walk(t.children)
      else res.push({ id: t.id, name: t.name })
    }
  }
  walk(tasks.value)
  return res
})

const filterOwner = ref<string | null>(null)

// ==================== 事件日志 ====================
const logs = ref<string[]>([])
let logSeq = 0
function log(msg: string) {
  logs.value.unshift(`[${String(++logSeq).padStart(2, '0')}] ${msg}`)
  if (logs.value.length > 30) logs.value.pop()
}

// ==================== 事件回调 ====================
function onTaskChange(p: any) {
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
}

function onLinkCreate(p: { from: string; to: string }) {
  const name = (id: string) => findName(tasks.value, id) ?? id
  links.value.push({ from: p.from, to: p.to, type: 'fs' })
  log(`新建依赖：${name(p.from)} → ${name(p.to)}`)
}

function onReschedule(changes: any[]) {
  const f = (d?: string) => (d ? d.slice(5) : '-')
  const lines = changes.map(
    (c) =>
      `「${c.task.name}」${f(c.oldStartDate)} ~ ${f(c.oldEndDate)} → ${f(c.task.startDate)} ~ ${f(c.task.endDate)}`
  )
  log(`依赖顺推 ${changes.length} 项：${lines.join('；')}`)
}

function onRowMove(p: any) {
  log(`行排序：「${p.task.name}」从位置 ${p.fromIndex} 移至 ${p.toIndex}`)
}

function onSelectionChange(ids: string[]) {
  log(`选中 ${ids.length} 项任务`)
}

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

// ==================== 操作方法 ====================
function onLocate() {
  if (locateId.value) ganttRef.value?.scrollToTask(locateId.value)
}

function doUndo() {
  const n = ganttRef.value?.undo()
  if (n) log(`撤销：还原 ${n.length} 项变更`)
}

function doRedo() {
  const n = ganttRef.value?.redo()
  if (n) log(`重做：重新应用 ${n.length} 项变更`)
}

function reset() {
  tasks.value = JSON.parse(JSON.stringify(demoTasks))
  links.value = [...demoLinks]
  log('数据已重置')
}

const scaleOptions: { value: ScaleType; label: string }[] = [
  { value: 'hour', label: '时' },
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' }
]
</script>

<script lang="ts">
// Demo 数据 — 与 examples/vue-demo 保持一致
import type { GanttTask, GanttLink } from '@gantt-pro/core'

function day(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dayTime(offset: number, h: number, m = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(h, m, 0, 0)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const demoTasks: GanttTask[] = [
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

const demoLinks: GanttLink[] = [
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

export { demoTasks, demoLinks }
</script>

<template>
  <div class="demo-app" :class="{ dark }">
    <div class="demo-controls">
      <!-- 刻度切换 -->
      <div class="demo-seg">
        <button
          v-for="s in scaleOptions"
          :key="s.value"
          :class="{ active: scale === s.value }"
          @click="scale = s.value"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- 开关按钮 -->
      <button @click="dark = !dark">
        {{ dark ? '☀️ 亮色' : '🌙 暗色' }}
      </button>
      <button @click="showCriticalPath = !showCriticalPath">
        {{ showCriticalPath ? '隐藏关键路径' : '显示关键路径' }}
      </button>
      <button @click="autoReschedule = !autoReschedule">
        依赖顺推: {{ autoReschedule ? '开' : '关' }}
      </button>
      <button @click="showBaseline = !showBaseline">
        基准线: {{ showBaseline ? '开' : '关' }}
      </button>
      <button @click="editable = !editable">
        行内编辑: {{ editable ? '开' : '关' }}
      </button>
      <button @click="rowDraggable = !rowDraggable">
        行拖拽: {{ rowDraggable ? '开' : '关' }}
      </button>
      <button @click="contextMenu = !contextMenu">
        右键菜单: {{ contextMenu ? '开' : '关' }}
      </button>

      <!-- 复选框开关 -->
      <label class="demo-check">
        <input v-model="readonly" type="checkbox" /> 只读
      </label>
      <label class="demo-check">
        <input v-model="allowLink" type="checkbox" /> 允许建线
      </label>
      <label class="demo-check">
        <input v-model="linkedResize" type="checkbox" /> 父子联动
      </label>
      <label class="demo-check">
        <input v-model="showCheckbox" type="checkbox" /> 复选框
      </label>
      <label class="demo-check">
        <input v-model="showDivider" type="checkbox" /> 分隔线
      </label>
      <label class="demo-check">
        <input v-model="resizableColumns" type="checkbox" /> 列调宽
      </label>
      <label class="demo-check">
        <input v-model="levelColor" type="checkbox" /> 层级色
      </label>
      <label class="demo-check">
        <input v-model="rowDblClick" type="checkbox" /> 行双击
      </label>
      <label class="demo-check">
        <input v-model="moveByUnit" type="checkbox" /> 按单位移动
      </label>
      <label class="demo-check">
        <input v-model="highlightDate" type="checkbox" /> 悬停高亮
      </label>

      <!-- 下拉选择 -->
      <label class="demo-check">
        负责人
        <select v-model="filterOwner" class="demo-search">
          <option :value="null">全部</option>
          <option v-for="o in owners" :key="o" :value="o">{{ o }}</option>
        </select>
      </label>
      <label class="demo-check">
        定位
        <select v-model="locateId" class="demo-search" @change="onLocate">
          <option :value="null">选择任务…</option>
          <option v-for="t in leafTasks" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </label>
      <label class="demo-check">
        语言
        <select v-model="locale" class="demo-search">
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </label>
      <label class="demo-check">
        进度小数
        <select v-model.number="progressDecimal" class="demo-search">
          <option :value="0">0 位</option>
          <option :value="1">1 位</option>
          <option :value="2">2 位</option>
        </select>
      </label>
      <label class="demo-check">
        条形对齐
        <select v-model="barAlignment" class="demo-search">
          <option value="left">左</option>
          <option value="center">中</option>
          <option value="right">右</option>
        </select>
      </label>

      <!-- 搜索 -->
      <input
        v-model="searchText"
        class="demo-search"
        type="text"
        placeholder="搜索任务…"
      />

      <!-- 操作按钮 -->
      <button @click="ganttRef?.scrollToToday()">今日</button>
      <button @click="doUndo">撤销</button>
      <button @click="doRedo">重做</button>
      <button @click="ganttRef?.print()">打印</button>
      <button @click="reset">重置数据</button>
    </div>

    <div class="demo-main">
      <GanttChart
        ref="ganttRef"
        v-model:data="tasks"
        v-model:scale="scale"
        :links="links"
        :dark="dark"
        :readonly="readonly"
        :show-baseline="showBaseline"
        :auto-reschedule="autoReschedule"
        :show-critical-path="showCriticalPath"
        :editable="editable"
        :allow-link="allowLink"
        :linked-resize="linkedResize"
        :row-draggable="rowDraggable"
        :show-checkbox="showCheckbox"
        :show-divider="showDivider"
        :resizable-columns="resizableColumns"
        :level-color="levelColor"
        :row-dbl-click="rowDblClick"
        :context-menu="contextMenu"
        :move-by-unit="moveByUnit"
        :highlight-date="highlightDate"
        :filter-owner="filterOwner"
        :holidays="holidays"
        :locale="locale"
        :progress-decimal="progressDecimal"
        :bar-alignment="barAlignment"
        :search="searchText"
        :empty-data="'暂无数据 😢'"
        :date-format="'MM-DD'"
        :row-height="38"
        :bar-height="24"
        :show-today="true"
        :zoom-on-wheel="true"
        style="height: 520px"
        @task-change="onTaskChange"
        @reschedule="onReschedule"
        @scale-change="(s: ScaleType) => log(`切换刻度：${s}`)"
        @link-create="onLinkCreate"
        @link-click="(l: GanttLink) => log(`点击依赖线：${l.from} → ${l.to}`)"
        @row-click="(t: GanttTask) => log(`点击行：${t.name}`)"
        @row-dbl-click="(t: GanttTask) => log(`双击行：${t.name}`)"
        @row-move="onRowMove"
        @selection-change="onSelectionChange"
        @expand="(t: GanttTask, v: boolean) => log(`${v ? '展开' : '折叠'}：${t.name}`)"
      />
    </div>

    <div class="demo-tips">
      💡 操作提示：拖动条形移动 · 拖两端缩放 · 悬停拖顶部圆点改进度 · 悬停右侧圆点拖到其他任务创建依赖 ·
      点击箭头/菱形图标折叠展开 · 时间区内 Ctrl + 滚轮缩放刻度 · 双击任务名称/进度单元格直接编辑 · 拖拽行排序 ·
      拖表头列宽边界调宽 · Checkbox 多选 · 父子联动缩放 · 右键菜单删除/添加依赖 · 切换语言英文刻度 · 悬停高亮 ·
      按单位移动 · 行双击 · 进度小数 · 条形对齐 · 搜索高亮 · 双击连线删除 · 打印 · 键盘导航(↑↓/Enter/Space)
    </div>

    <div class="demo-log">
      <div class="demo-log-title">事件日志</div>
      <div v-if="!logs.length" class="demo-log-empty">暂无事件，去拖动任务条试试</div>
      <div v-for="(l, i) in logs" :key="i" class="demo-log-item">{{ l }}</div>
    </div>
  </div>
</template>

<style scoped>
.demo-app {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border, #e2e8f0);
  background: var(--vp-c-bg, #fff);
  overflow: hidden;
}
.demo-app.dark {
  background: #1a1a2e;
  color: #eee;
}

.demo-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.demo-controls button,
.demo-controls select {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-border, #ddd);
  border-radius: 4px;
  background: var(--vp-c-bg, #fff);
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-text-1, #4b5563);
  transition: border-color 0.15s, color 0.15s;
}
.demo-controls button:hover {
  border-color: #4f7cff;
  color: #4f7cff;
}
.demo-app.dark .demo-controls button,
.demo-app.dark .demo-controls select {
  background: #333;
  color: #eee;
  border-color: #555;
}

.demo-check {
  font-size: 13px;
  color: var(--vp-c-text-1, #4b5563);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.demo-app.dark .demo-check {
  color: #ccc;
}

.demo-seg {
  display: inline-flex;
  border: 1px solid var(--vp-c-border, #d5d8de);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg, #fff);
}
.demo-seg button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--vp-c-text-1, #4b5563);
  border-radius: 0;
}
.demo-seg button + button {
  border-left: 1px solid var(--vp-c-divider, #e5e7eb);
}
.demo-seg button.active {
  background: #4f7cff;
  color: #fff;
}
.demo-app.dark .demo-seg {
  border-color: #555;
  background: #2a2a3e;
}
.demo-app.dark .demo-seg button {
  color: #ccc;
}
.demo-app.dark .demo-seg button.active {
  background: #4f7cff;
  color: #fff;
}

.demo-search {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-border, #cbd5e1);
  border-radius: 6px;
  font-size: 12px;
  width: 120px;
}
.dark .demo-search {
  background: #1e293b;
  border-color: #475569;
  color: #e2e8f0;
}

.demo-main {
  border: 1px solid var(--vp-c-border, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.demo-app.dark .demo-main {
  border-color: #444;
  background: #1e1e30;
}

.demo-tips {
  margin-top: 12px;
  font-size: 12px;
  color: var(--vp-c-text-2, #8b929e);
  line-height: 1.6;
}

.demo-log {
  margin-top: 14px;
  background: var(--vp-c-bg-alt, #fff);
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 12px;
  max-height: 180px;
  overflow: auto;
  border: 1px solid var(--vp-c-border, #e5e7eb);
}
.demo-app.dark .demo-log {
  background: #1e1e30;
  border-color: #444;
}
.demo-log-title {
  font-weight: 600;
  color: var(--vp-c-text-1, #4b5563);
  margin-bottom: 8px;
}
.demo-app.dark .demo-log-title {
  color: #ccc;
}
.demo-log-empty {
  color: var(--vp-c-text-3, #b0b7c3);
}
.demo-log-item {
  color: var(--vp-c-text-2, #6b7280);
  padding: 2px 0;
  border-bottom: 1px dashed var(--vp-c-divider, #f0f1f4);
}
.demo-app.dark .demo-log-item {
  color: #aaa;
  border-bottom-color: #333;
}
</style>
