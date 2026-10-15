<script setup lang="ts">
import { inject, ref, onMounted, onBeforeUnmount } from 'vue'
import { GANTT_KEY } from './store'
import type { GanttLink, LinkType } from '@gantt-pro/core'

const store = inject(GANTT_KEY)!

/** 连线右键菜单状态 */
const ctxMenu = ref<{ x: number; y: number; link: GanttLink } | null>(null)

/** 连线右键 */
function onContextMenu(e: MouseEvent, link: GanttLink) {
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = { x: e.clientX, y: e.clientY, link }
}

/** 双击连线 → 弹出操作菜单 */
function onDblClick(e: MouseEvent, link: GanttLink) {
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = { x: e.clientX, y: e.clientY, link }
}

function deleteLink() {
  if (!ctxMenu.value) return
  store.removeLink(ctxMenu.value.link)
  ctxMenu.value = null
}

function changeType(type: LinkType) {
  if (!ctxMenu.value) return
  store.changeLinkType(ctxMenu.value.link, type)
  ctxMenu.value = null
}

function closeCtxMenu() {
  ctxMenu.value = null
}

// ==================== 拖拽端点重连 ====================
const dragReconnect = ref<{ link: GanttLink; side: 'from' | 'to'; x: number; y: number } | null>(null)

function onEndpointPointerDown(e: PointerEvent, link: GanttLink, side: 'from' | 'to') {
  if (store.readonly.value) return
  e.preventDefault()
  e.stopPropagation()
  const startPt = store.toLocal(e.clientX, e.clientY)
  dragReconnect.value = { link, side, x: startPt.x, y: startPt.y }

  const move = (ev: PointerEvent) => {
    if (!dragReconnect.value) return
    const p = store.toLocal(ev.clientX, ev.clientY)
    dragReconnect.value.x = p.x
    dragReconnect.value.y = p.y
  }
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    if (!dragReconnect.value) return
    const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
    const bar = el?.closest('[data-task-id]') as HTMLElement | null
    const newId = bar?.dataset.taskId
    if (newId && newId !== dragReconnect.value.link.from && newId !== dragReconnect.value.link.to) {
      store.reconnectLink(dragReconnect.value.link, dragReconnect.value.side, newId)
    }
    dragReconnect.value = null
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** 全局点击关闭菜单 */
function onGlobalClick() {
  if (ctxMenu.value) ctxMenu.value = null
}
onMounted(() => document.addEventListener('click', onGlobalClick))
onBeforeUnmount(() => document.removeEventListener('click', onGlobalClick))

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: 'fs', label: '完成→开始 (FS)' },
  { value: 'ss', label: '开始→开始 (SS)' },
  { value: 'ff', label: '完成→完成 (FF)' },
  { value: 'sf', label: '开始→完成 (SF)' },
]

/** 从 path d 字符串中提取起点坐标 */
function pathStart(d: string): { x: number; y: number } {
  const m = d.match(/M\s*([-\d.]+)\s+([-\d.]+)/)
  return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 }
}
/** 从 path d 字符串中提取终点坐标 */
function pathEnd(d: string): { x: number; y: number } {
  const nums = d.match(/[-\d.]+/g)?.map(Number) ?? [0, 0]
  return { x: nums[nums.length - 2] ?? 0, y: nums[nums.length - 1] ?? 0 }
}
</script>

<template>
  <svg class="gt-link-layer">
    <defs>
      <marker
        id="gt-arrow"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 9 5 L 0 9 z" class="gt-arrow-head" />
      </marker>
      <marker
        id="gt-arrow-dashed"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 9 5 L 0 9 z" class="gt-arrow-head" />
      </marker>
    </defs>
    <g v-for="p in store.linkPaths.value" :key="p.key">
      <!-- 命中区域（透明粗线，方便点击） -->
      <path
        class="gt-link-hit"
        :d="p.d"
        @click.stop="store.emitLinkClick(p.link)"
        @dblclick.stop="onDblClick($event, p.link)"
        @contextmenu.stop="onContextMenu($event, p.link)"
      />
      <!-- 可见线：fs/ss=实线，ff/sf=虚线 -->
      <path
        class="gt-link-line"
        :class="{ critical: p.critical, dashed: p.link.type === 'ff' || p.link.type === 'sf' }"
        :d="p.d"
        :style="{ stroke: p.color }"
        :marker-end="p.link.type === 'ff' || p.link.type === 'sf' ? 'url(#gt-arrow-dashed)' : 'url(#gt-arrow)'"
      />
      <!-- 起点端点圆圈（拖拽重连） -->
      <circle
        class="gt-link-endpoint"
        :cx="pathStart(p.d).x"
        :cy="pathStart(p.d).y"
        r="5"
        @pointerdown.stop="onEndpointPointerDown($event, p.link, 'from')"
      />
      <!-- 终点端点圆圈（拖拽重连） -->
      <circle
        class="gt-link-endpoint"
        :cx="pathEnd(p.d).x"
        :cy="pathEnd(p.d).y"
        r="5"
        @pointerdown.stop="onEndpointPointerDown($event, p.link, 'to')"
      />
    </g>
    <path
      v-if="store.linkDraftLine.value"
      class="gt-link-line draft"
      :d="`M ${store.linkDraftLine.value.x1} ${store.linkDraftLine.value.y1} L ${store.linkDraftLine.value.x2} ${store.linkDraftLine.value.y2}`"
    />
  </svg>

  <!-- 连线右键/双击菜单 -->
  <Teleport to="body">
    <div
      v-if="ctxMenu"
      class="gt-link-ctx-menu"
      :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
      @click.stop
    >
      <div class="gt-link-ctx-title">连线操作</div>
      <button class="gt-link-ctx-item danger" @click="deleteLink">🗑 删除连线</button>
      <div class="gt-link-ctx-divider" />
      <div class="gt-link-ctx-label">修改类型</div>
      <button
        v-for="t in LINK_TYPES"
        :key="t.value"
        class="gt-link-ctx-item"
        :class="{ active: (ctxMenu.link.type ?? 'fs') === t.value }"
        @click="changeType(t.value)"
      >
        {{ t.label }}
      </button>
    </div>
  </Teleport>
</template>

<style>
.gt-link-endpoint {
  fill: var(--gt-link, #4b9cd3);
  stroke: #fff;
  stroke-width: 1.5;
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s;
}
.gt-link-layer g:hover .gt-link-endpoint {
  opacity: 1;
}
.gt-link-endpoint:hover {
  r: 7;
}
.gt-link-ctx-menu {
  position: fixed;
  z-index: 9999;
  background: var(--gt-bg, #fff);
  border: 1px solid var(--gt-border, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 200px;
  font-size: 13px;
}
.gt-link-ctx-title {
  padding: 6px 12px;
  font-weight: 600;
  color: var(--gt-text, #333);
  border-bottom: 1px solid var(--gt-border, #eee);
  margin-bottom: 4px;
}
.gt-link-ctx-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--gt-text, #333);
}
.gt-link-ctx-item:hover {
  background: var(--gt-row-hover, #f0f7ff);
}
.gt-link-ctx-item.active {
  color: var(--gt-primary, #4b9cd3);
  font-weight: 600;
}
.gt-link-ctx-item.danger {
  color: var(--gt-danger, #f56565);
}
.gt-link-ctx-item.danger:hover {
  background: #fef0f0;
}
.gt-link-ctx-divider {
  height: 1px;
  background: var(--gt-border, #eee);
  margin: 4px 0;
}
.gt-link-ctx-label {
  padding: 4px 12px;
  font-size: 11px;
  color: var(--gt-text-light, #999);
  text-transform: uppercase;
}
</style>
