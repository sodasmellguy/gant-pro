<script setup lang="ts">
import { computed, inject, ref, useSlots } from 'vue'
import { GANTT_KEY, type Geom } from './store'

const props = defineProps<{
  geom: Geom
  showSlot?: boolean
  alignment?: 'left' | 'center' | 'right'
  progressColor?: string
}>()
const slots = useSlots()

const store = inject(GANTT_KEY)!

const task = computed(() => props.geom.task)
const progress = computed(() => (props.geom.summary ? store.summaryProgress(task.value) : (task.value.progress ?? 0)))

const wrapperStyle = computed(() => {
  const g = props.geom
  return {
    left: `${g.x}px`,
    top: `${g.y}px`,
    width: `${Math.max(g.w, 2)}px`,
    height: `${store.rowHeight.value}px`
  }
})

const barStyle = computed(() => {
  const g = props.geom
  if (g.milestone) {
    const size = Math.min(g.h + 10, 22)
    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `calc(50% - ${size / 2}px)`,
      top: `calc(50% - ${size / 2}px)`,
      color: task.value.color || 'var(--gt-milestone)'
    }
  }
  return {
    width: `${Math.max(g.w, 2)}px`,
    height: `${g.h}px`,
    left: props.alignment === 'left' ? '0px' : props.alignment === 'right' ? 'auto' : '0px',
    right: props.alignment === 'right' ? '0px' : undefined,
    top: '50%',
    transform: props.alignment === 'center' ? 'translateY(-50%)' : undefined,
    marginTop: props.alignment !== 'center' ? `calc(-${g.h / 2}px)` : undefined,
    background: g.summary
      ? 'transparent'
      : task.value.color
        ? `linear-gradient(180deg, ${task.value.color}, ${task.value.color})`
        : undefined
  }
})

const selected = computed(() => store.selectedId.value === task.value.id)
const hovered = computed(() => store.hoverId.value === task.value.id)
const showLabel = computed(() => !props.geom.milestone && props.geom.w > 46)
const labelOutside = computed(() => props.geom.w < 120 && !props.geom.summary)

// 负责人小标签：条形右端外侧（条形太窄时省略，负责人仍显示在左侧表格列）
const ownerLabel = computed(() => {
  if (props.geom.summary || props.geom.milestone || labelOutside.value) return ''
  const o = task.value.owner
  if (o == null) return ''
  return typeof o === 'string' ? o : o.name
})
const ownerStyle = computed(() => {
  const o = task.value.owner
  return typeof o === 'object' && o && o.color ? { background: o.color } : undefined
})

const hasBarSlot = computed(() => props.showSlot === true && !!slots['bar-content'])
const wrapEl = ref<HTMLElement>()

function onDown(e: PointerEvent, mode: 'move' | 'left' | 'right') {
  if (store.selectedId) store.selectedId.value = task.value.id
  store.startDrag(e, task.value, mode)
}

function onProgressDown(e: PointerEvent) {
  store.startDrag(e, task.value, 'progress')
}

function onAnchorDown(e: PointerEvent) {
  store.startLinkDraft(e, task.value)
}

function onClick(e: MouseEvent) {
  e.stopPropagation()
  store.selectedId.value = task.value.id
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  store.selectedId.value = task.value.id
  store.triggerContextMenu(task.value, e)
}

// hover 挂在 wrapper 上：锚点/手柄都在 wrapper 子树内，移向它们不会丢 hover
function onEnter(e: MouseEvent) {
  store.hoverId.value = task.value.id
  store.showTip(e, task.value)
}
function onMove(e: MouseEvent) {
  store.moveTip(e)
}
function onWrapLeave(e: MouseEvent) {
  if (wrapEl.value && e.relatedTarget instanceof Node && wrapEl.value.contains(e.relatedTarget)) return
  store.hoverId.value = null
  store.hideTip()
}
</script>

<script lang="ts">
export default { name: 'GanttTaskBar' }
</script>

<template>
  <div
    ref="wrapEl"
    class="gt-bar-wrap"
    :class="{ 'gt-drag-source': true }"
    :style="wrapperStyle"
    :data-task-id="task.id"
    role="gridcell"
    :aria-label="`${task.name}${geom.milestone ? ' (milestone)' : ''}${geom.summary ? ' (summary)' : ''}, progress ${progress}%`"
    :aria-selected="selected"
    @mouseenter="onEnter"
    @mousemove="onMove"
    @mouseleave="onWrapLeave"
    @contextmenu="onContextMenu"
  >
    <!-- 基准线（计划）：普通任务/汇总行为灰条，里程碑为空心菱形 -->
    <div
      v-if="geom.baseline && !geom.milestone"
      class="gt-baseline"
      :class="{ overdue: geom.overdue }"
      :style="{ left: geom.bx - geom.x + 'px', width: geom.bw + 'px' }"
    />
    <div
      v-else-if="geom.baseline && geom.milestone"
      class="gt-baseline-dia"
      :class="{ overdue: geom.overdue }"
      :style="{ left: geom.bx - geom.x + 'px' }"
    />
    <!-- 里程碑 -->
    <div
      v-if="geom.milestone"
      class="gt-milestone"
      :class="{ selected, critical: geom.critical }"
      :style="barStyle"
      role="img"
      :aria-label="`${task.name} milestone`"
      @pointerdown="onDown($event, 'move')"
      @click="onClick"
    />
    <!-- 汇总条 -->
    <div v-else-if="geom.summary" class="gt-summary" :class="{ selected }" role="img" :aria-label="`${task.name} summary, progress ${progress}%`" :style="barStyle" @click="onClick">
      <span class="gt-summary-cap left" />
      <div class="gt-summary-track">
        <div class="gt-summary-fill" :style="{ width: progress + '%' }" />
      </div>
      <span class="gt-summary-cap right" />
    </div>
    <!-- 普通任务条 -->
    <div
      v-else
      class="gt-bar"
      :class="{
        selected,
        hovered,
        critical: geom.critical,
        'gt-bar-effect-shimmer': task.barEffect === 'shimmer',
        'gt-bar-effect-pulse': task.barEffect === 'pulse',
        'gt-status-planned': task.status === 'planned',
        'gt-status-active': task.status === 'active',
        'gt-status-blocked': task.status === 'blocked',
        'gt-status-done': task.status === 'done'
      }"
      :style="barStyle"
      role="img"
      :aria-label="`${task.name}, ${task.startDate || ''} to ${task.endDate || ''}, ${progress}% complete`"
      @pointerdown="onDown($event, 'move')"
      @click="onClick"
    >
      <slot v-if="hasBarSlot" name="bar-content" :task="task" :geom="geom" :progress="progress" />
      <template v-else>
        <div class="gt-bar-fill" :style="{ width: progress + '%' }" />
        <!-- 预期进度标记线 -->
        <div v-if="geom.expectedX != null" class="gt-expected-line" :style="{ left: geom.expectedX - geom.x + 'px' }" />
        <!-- 分段渲染 -->
        <template v-if="geom.segments?.length">
          <div
            v-for="(seg, si) in geom.segments"
            :key="'seg' + si"
            class="gt-segment"
            :style="{ left: seg.x - geom.x + 'px', width: seg.w + 'px', background: seg.color || undefined }"
          >
            <div v-if="seg.progress != null" class="gt-segment-fill" :style="{ width: seg.progress + '%' }" />
          </div>
        </template>
        <span v-if="showLabel" class="gt-bar-label" :class="{ outside: labelOutside }">
          {{ task.name }}
        </span>
        <div
          v-if="!labelOutside && progress > 0 && progress < 100"
          class="gt-progress-divider"
          :style="{ left: progress + '%' }"
        />
        <span class="gt-handle left" @pointerdown.stop="onDown($event, 'left')" />
        <span class="gt-handle right" @pointerdown.stop="onDown($event, 'right')" />
        <span
          v-if="progress > 0 && progress < 100"
          class="gt-progress-thumb"
          :style="{ left: `calc(${progress}% - 5px)` }"
          @pointerdown.stop="onProgressDown"
        />
      </template>
    </div>
    <!-- 负责人小标签（条形右端外侧） -->
    <span v-if="ownerLabel" class="gt-owner-tag" :style="ownerStyle">{{ ownerLabel }}</span>
    <!-- 连线锚点 -->
    <span
      v-if="hovered && store.allowLink.value"
      class="gt-anchor"
      :style="
        geom.milestone
          ? { left: `calc(50% + ${Math.min(geom.h + 10, 22) / 2}px)`, top: '50%' }
          : { right: '-12px', top: '50%' }
      "
      :title="'拖拽到另一任务以创建依赖'"
      @pointerdown.stop="onAnchorDown"
    />
  </div>
</template>
