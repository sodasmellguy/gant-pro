<script setup lang="ts">
import { ref, computed } from 'vue'
import { GanttChart } from '@gantt-pro/vue'
import '@gantt-pro/vue/style.css'
import type { GanttTask, GanttLink, ScaleType, HolidayItem } from '@gantt-pro/core'
import { demoTasks, demoLinks } from './demo-data'

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
const jumpDate = ref('')

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

<template>
  <div class="demo-app" :class="{ dark }">
    <header class="demo-header">
      <h1>Gantt Pro — Vue Demo</h1>
      <p>跨框架甘特图组件 · 任务树 / 拖拽调整 / 依赖连线 / 里程碑 / 多刻度 / 虚拟滚动 / 暗色主题</p>
    </header>

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

    <main class="demo-main" style="margin-top: 16px">
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
        style="height: 560px"
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
    </main>

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
