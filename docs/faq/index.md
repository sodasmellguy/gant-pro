# 常见问题 (FAQ)

## 安装与使用

### Q: 安装后样式不生效？

**A:** 确保引入了 CSS 文件：

```ts
import '@gantt-pro/vue/style.css'    // Vue
import '@gantt-pro/react/style.css'  // React
```

如果你使用 CDN，确保 `<link>` 标签在 HTML `<head>` 中。

### Q: 组件高度为 0，看不到内容？

**A:** `GanttChart` 填充父容器高度，父容器必须设置高度：

```vue
<!-- ❌ 错误 -->
<div>
  <GanttChart :data="tasks" />
</div>

<!-- ✅ 正确：设置固定高度 -->
<div style="height: 500px;">
  <GanttChart :data="tasks" />
</div>

<!-- ✅ 也可以用 flex -->
<div style="flex: 1; min-height: 0;">
  <GanttChart :data="tasks" />
</div>
```

### Q: pnpm 安装报 esbuild 构建脚本被忽略？

**A:** pnpm 默认阻止依赖的 `postinstall` 脚本。在 `pnpm-workspace.yaml` 中添加：

```yaml
allowBuilds:
  esbuild: true
```

然后重新 `pnpm install`。

### Q: 日期显示偏移了一天？

**A:** 检查日期格式。`gantt-pro` 使用本地时区解析日期，不使用 `new Date('2025-01-01')`（某些浏览器按 UTC 解析导致偏移）。确保使用以下格式：

```ts
// ✅ 正确
{ startDate: '2025-01-01' }               // YYYY-MM-DD
{ startDate: '2025-01-01T09:00' }         // 带时间
{ startDate: new Date(2025, 0, 1) }       // Date 对象

// ❌ 可能出问题
{ startDate: '2025-01-01T00:00:00.000Z' } // ISO UTC 格式
{ startDate: '2025/01/01' }                // 斜杠分隔
```

---

## 数据与交互

### Q: 拖拽任务后数据没更新？

**A:** 确保使用 `v-model:data` 或监听 `task-change` 事件：

```vue
<!-- 方式一：v-model（推荐） -->
<GanttChart v-model:data="tasks" />

<!-- 方式二：事件监听 -->
<GanttChart :data="tasks" @task-change="onTaskChange" />
```

### Q: 嵌套任务的父任务日期不对？

**A:** 父任务的 `startDate` / `endDate` 会**自动取子任务的极值**。如果父任务也设置了日期，可能与自动计算冲突。建议**不给父任务设置日期**，让它自动计算：

```ts
// ✅ 推荐：父任务不设日期
{
  id: 'phase1',
  name: '第一阶段',
  // 不设 startDate / endDate，自动取子任务极值
  children: [
    { id: 't1', name: '任务A', startDate: '2025-01-01', endDate: '2025-01-05' },
    { id: 't2', name: '任务B', startDate: '2025-01-06', endDate: '2025-01-10' },
  ],
}
```

### Q: 后端返回的字段名不一样怎么办？

**A:** 使用 `fieldMap` 映射，无需改数据：

```vue
<GanttChart
  :data="apiData"
  :field-map="{
    id: 'task_id',
    name: 'task_name',
    start: 'begin_date',
    end: 'end_date',
    progress: 'completion_rate'
  }"
/>
```

### Q: 如何实现只读模式？

**A:** 设置 `readonly` 为 `true`：

```vue
<GanttChart :data="tasks" :readonly="true" :allow-link="false" />
```

只读模式下禁用所有拖拽、连线创建和编辑，但保留展开/折叠、点击/选择。

### Q: 如何禁用拖拽创建连线？

**A:** 设置 `allow-link` 为 `false`：

```vue
<GanttChart :data="tasks" :allow-link="false" />
```

### Q: 任务 ID 可以用数字吗？

**A:** 不行，`id` 必须是 `string` 类型。如果是数字，转换为字符串：

```ts
const tasks = apiData.map(t => ({ ...t, id: String(t.id) }))
```

---

## 性能

### Q: 任务很多（500+），滚动卡顿？

**A:** 虚拟滚动默认开启，但请检查：

1. **任务 ID 要稳定唯一**，不要用数组 index 作为 ID
2. **避免在模板中做复杂计算**，用 `computed` 缓存
3. **减少 `infinitePadding`**，默认 30 天，数据量大时可以减到 7

```vue
<GanttChart :data="tasks" :infinite-padding="7" />
```

### Q: 如何优化大数据量渲染？

**A:**

1. 只读模式减少事件监听开销
2. 关闭不需要的功能（`showCheckbox`、`contextMenu` 等）
3. 使用 `rangeStart` / `rangeEnd` 限制可见时间范围
4. 避免频繁更新整个 `data` 数组，改用局部更新

---

## 功能问题

### Q: 关键路径没有高亮？

**A:** 关键路径需要同时有**任务**和**依赖连线**才能计算。检查：

1. 开启了 `show-critical-path`
2. 传入了 `links` 依赖数组
3. 依赖连线没有形成环（有环时返回空集）

### Q: 依赖顺推不生效？

**A:** 检查：

1. 开启了 `auto-reschedule`
2. 依赖类型正确（`fs` 类型才会顺推开始时间）
3. 依赖连线没有环

### Q: 基准线不显示？

**A:** 任务需要同时设置 `baselineStart` 和 `baselineEnd`，且开启 `showBaseline`：

```ts
{
  id: 't1',
  name: '任务',
  startDate: '2025-01-03',
  endDate: '2025-01-08',
  baselineStart: '2025-01-01',  // 必须设置
  baselineEnd: '2025-01-05',    // 必须设置
}
```

```vue
<GanttChart :data="tasks" :show-baseline="true" />
```

### Q: 导出 PNG 失败？

**A:** PNG 导出使用 SVG foreignObject + Canvas 方案，可能的原因：

1. **跨域样式**：CSS 文件跨域导致 SVG 渲染失败。确保 CSS 同源或配置 CORS。
2. **CSS 变量未解析**：组件会自动内联 CSS 变量，但如果有自定义外部变量可能不生效。
3. **DOM 结构复杂**：极少数情况下 foreignObject 序列化失败。

替代方案：使用浏览器截图工具或 Puppeteer 截图。

### Q: 撤销/重做按钮一直灰色？

**A:** `canUndo` / `canRedo` 是响应式的，需要通过 ref 正确读取：

```ts
// Vue
const canUndo = computed(() => ganttRef.value?.canUndo?.value ?? false)
```

---

## 框架差异

### Q: Vue 和 React 的 API 一样吗？

**A:** 功能完全对齐，差异在于：

| 差异点 | Vue | React |
|---|---|---|
| 双向绑定 | `v-model:data` | `onDataChange` 回调 |
| 事件 | `@task-change` | `onTaskChange` prop |
| ref | `ref<GanttRef>()` | `useRef<GanttRef>()` |
| 插槽 | `<template #col-name>` | `renderBarContent` 函数 |
| 全局注册 | `app.use(GanttProVue)` | 不支持 |

### Q: 支持 Vue 2 吗？

**A:** 不支持。gantt-pro 的 Vue 适配层基于 Vue 3 的 Composition API。Vue 2 请考虑使用 vue-ganttastic 或其他库。

### Q: 支持 Nuxt / Next.js 吗？

**A:** 支持。gantt-pro 是纯客户端组件，在 SSR 框架中使用时确保组件只在客户端渲染：

```vue
<!-- Nuxt -->
<ClientOnly>
  <GanttChart :data="tasks" />
</ClientOnly>
```

```tsx
// Next.js
import dynamic from 'next/dynamic'

const GanttChart = dynamic(
  () => import('@gantt-pro/react').then(m => m.GanttChart),
  { ssr: false }
)
```

### Q: 支持 Solid / Svelte / Angular 吗？

**A:** 官方只提供 Vue 和 React 适配层。但核心引擎 `@gantt-pro/core` 是框架无关的，你可以基于它自行适配。参考 [核心引擎文档](../guide/engine)。
