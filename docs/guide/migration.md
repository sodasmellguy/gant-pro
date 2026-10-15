# 从其他库迁移

本页帮助你从其他甘特图库迁移到 gantt-pro。

## 从 frappe-gantt 迁移

### 数据结构对照

| frappe-gantt | gantt-pro | 说明 |
|---|---|---|
| `id` | `id` | 相同 |
| `name` | `name` | 相同 |
| `start` | `startDate` | 字段名不同 |
| `end` | `endDate` | 字段名不同 |
| `progress` | `progress` | 相同 |
| `dependencies` | `links` | frappe 用字符串 `'t1,t2'`，gantt-pro 用对象数组 |
| `custom_class` | `color` / `barEffect` | gantt-pro 用独立字段 |

### 字段映射方案

如果你的数据结构是 frappe-gantt 风格，不想改数据，用 `fieldMap`：

```ts
// frappe-gantt 风格数据
const tasks = [
  { id: 't1', name: '任务', start: '2025-01-01', end: '2025-01-05', progress: 50, dependencies: 't0' },
]

// gantt-pro 适配
<GanttChart
  :data="tasks"
  :field-map="{ start: 'start', end: 'end' }"
  :links="frappeLinks"
/>
```

### 依赖关系转换

frappe-gantt 的 `dependencies: 't1,t2'` 需要转换为 `links` 数组：

```ts
function frappeDepsToLinks(tasks: any[]): GanttLink[] {
  const links: GanttLink[] = []
  for (const t of tasks) {
    if (t.dependencies) {
      for (const dep of t.dependencies.split(',').map((s: string) => s.trim()).filter(Boolean)) {
        links.push({ from: dep, to: t.id, type: 'fs' })
      }
    }
  }
  return links
}
```

### 功能增强

迁移后你可以用 frappe-gantt 没有的功能：

```vue
<GanttChart
  :data="tasks"
  :links="links"
  :show-critical-path="true"    <!-- frappe-gantt 没有 -->
  :auto-reschedule="true"       <!-- frappe-gantt 没有 -->
  :editable="true"              <!-- frappe-gantt 没有 -->
  :show-baseline="true"         <!-- frappe-gantt 没有 -->
/>
```

---

## 从 dhtmlx-gantt 迁移

### 数据结构对照

| dhtmlx-gantt | gantt-pro | 说明 |
|---|---|---|
| `id` | `id` | 相同 |
| `text` | `name` | 字段名不同 |
| `start_date` | `startDate` | 格式 'YYYY-MM-DD' |
| `duration` | `endDate`（计算） | gantt-pro 用 endDate，不存 duration |
| `progress` | `progress` | 相同 |
| `parent` | `children`（树形） | dhtmlx 用 parent ID，gantt-pro 用嵌套树 |
| `type: 'project'` | 自动判断 | gantt-pro 有子任务自动为汇总行 |
| `type: 'milestone'` | `milestone: true` | 布尔字段 |

### 扁平转树形

dhtmlx-gantt 使用扁平结构 + `parent` 字段，gantt-pro 使用树形嵌套：

```ts
// dhtmlx 扁平数据
const flatTasks = [
  { id: 1, text: '项目', parent: 0 },
  { id: 2, text: '任务A', parent: 1, start_date: '2025-01-01', duration: 5, progress: 50 },
  { id: 3, text: '任务B', parent: 1, start_date: '2025-01-06', duration: 7, progress: 30 },
]

// 转为 gantt-pro 树形
function flatToTree(flat: any[]): GanttTask[] {
  const map = new Map<number, GanttTask>()
  const roots: GanttTask[] = []

  // 第一遍：创建节点
  for (const f of flat) {
    map.set(f.id, {
      id: String(f.id),
      name: f.text,
      startDate: f.start_date,
      endDate: f.start_date ? addDays(toDate(f.start_date), (f.duration || 1) - 1) : undefined,
      progress: f.progress || 0,
      milestone: f.type === 'milestone',
      children: [],
    })
  }

  // 第二遍：组装树
  for (const f of flat) {
    const node = map.get(f.id)!
    if (f.parent && map.has(f.parent)) {
      map.get(f.parent)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  // 清理空 children
  const clean = (nodes: GanttTask[]) => {
    for (const n of nodes) {
      if (n.children?.length === 0) delete n.children
      else if (n.children) clean(n.children)
    }
  }
  clean(roots)

  return roots
}
```

### 依赖关系

| dhtmlx-gantt | gantt-pro |
|---|---|
| `links: [{ id: 1, source: 't1', target: 't2', type: '0' }]` | `links: [{ from: 't1', to: 't2', type: 'fs' }]` |

dhtmlx 类型映射：`'0' → 'fs'`、`'1' → 'ff'`、`'2' → 'ss'`、`'3' → 'sf'`

```ts
function dhtmlxLinksToGantt(links: any[]): GanttLink[] {
  const typeMap: Record<string, LinkType> = { '0': 'fs', '1': 'ff', '2': 'ss', '3': 'sf' }
  return links.map(l => ({
    from: String(l.source),
    to: String(l.target),
    type: typeMap[l.type] || 'fs',
  }))
}
```

### 配置对照

| dhtmlx-gantt | gantt-pro |
|---|---|
| `gantt.config.scale_unit = 'day'` | `scale="day"` |
| `gantt.config.readonly = true` | `:readonly="true"` |
| `gantt.config.show_progress = false` | 删除 `progress` 字段 |
| `gantt.config.row_height = 40` | `:row-height="40"` |
| `gantt.init('container')` | `<GanttChart :data="tasks" />` |

---

## 从 vue-ganttastic 迁移

### 数据结构

vue-ganttastic 和 gantt-pro 数据结构接近，主要差异：

| vue-ganttastic | gantt-pro |
|---|---|
| `label` | `name` |
| `start_date` / `end_date` | `startDate` / `endDate` |
| `bar_children` | `children`（嵌套树） |

```ts
// 字段映射
<GanttChart
  :data="ganttasticData"
  :field-map="{ name: 'label', start: 'start_date', end: 'end_date', children: 'bar_children' }"
/>
```

### 主要优势

迁移后获得：

- **关键路径分析** — vue-ganttastic 不支持
- **撤销/重做** — vue-ganttastic 不支持
- **虚拟滚动** — vue-ganttastic 不支持
- **React 支持** — vue-ganttastic 仅支持 Vue 2
- **暗色模式** — vue-ganttastic 不支持
- **零依赖** — vue-ganttastic 依赖 dayjs

---

## 迁移清单

迁移时按此清单逐项检查：

- [ ] 数据结构转换（字段名 / 扁平转树形）
- [ ] 依赖关系转换（字符串 → 对象数组）
- [ ] 里程碑字段转换（`type: 'milestone'` → `milestone: true`）
- [ ] 引入样式文件（`import '@gantt-pro/vue/style.css'`）
- [ ] 设置容器高度
- [ ] 验证日期格式（`YYYY-MM-DD`）
- [ ] 测试拖拽交互
- [ ] 测试依赖连线
- [ ] 配置主题和颜色
