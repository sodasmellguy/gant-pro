# 依赖连线

gantt-pro 支持 4 种依赖关系类型，以及拖拽创建、自动顺推、环检测等高级能力。

<GanttDemo />

## 依赖类型详解

### 四种依赖类型

| 类型 | 全称 | 含义 | 图示 |
|---|---|---|---|
| `fs` | Finish-Start | 前置**完成**后，后续才能**开始** | `━━━▶ ━━━` |
| `ss` | Start-Start | 前置**开始**后，后续才能**开始** | `━━━▶ ━━━`（起点对齐） |
| `ff` | Finish-Finish | 前置**完成**后，后续才能**完成** | `━━━▶ ━━━`（终点对齐） |
| `sf` | Start-Finish | 前置**开始**后，后续才能**完成** | 较少使用 |

::: tip 最常用的是 fs
`fs`（Finish-Start）是项目管理中最常见的依赖关系，表示"前者完成后后者才能开始"。如果你不确定用哪个，就用 `fs`。
:::

### 类型图示

```
fs (Finish-Start)：
  任务A ━━━━━┓
              ┃
  任务B       ┗━━━━━

ss (Start-Start)：
  任务A ━━━━━━━━━━━━
        ┃
  任务B ┗━━━━━━━━━━━

ff (Finish-Finish)：
  任务A ━━━━━━━━━━━━┓
                    ┃
  任务B ━━━━━━━━━━━━┛

sf (Start-Finish)：
  任务A ━━━━━━━━━━━━━━━━━┓
                        ┃
  任务B ━━━━━━━━━━━━━━━━━┛
```

## 定义连线

```ts
const links: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },                    // 基本用法
  { from: 't2', to: 't3', type: 'ss' },                    // 开始-开始
  { from: 't1', to: 't3', type: 'ff', color: '#ef4444' },  // 自定义颜色
]
```

```vue
<GanttChart :data="tasks" :links="links" />
```

## 拖拽创建连线

默认启用。从任务条右端的锚点拖拽到另一个任务即可创建依赖：

```
  任务A ━━━━━━━━●  ← 拖拽此锚点
                 ╲
                  ╲ 拖拽到
                   ╲
  任务B            ━●━━━━━━━
```

```vue
<!-- 默认启用 -->
<GanttChart :data="tasks" :allow-link="true" />

<!-- 关闭拖拽创建 -->
<GanttChart :data="tasks" :allow-link="false" />
```

创建后触发 `link-create` 事件：

```vue
<GanttChart :data="tasks" @link-create="onLinkCreate" />
```

```ts
function onLinkCreate(payload: { from: string; to: string }) {
  console.log(`创建连线: ${payload.from} → ${payload.to}`)
  // 可以在这里持久化到后端
}
```

## 依赖顺推

开启 `autoReschedule` 后，拖拽改变任务时间时，后续依赖任务自动顺推。

### 工作原理

```
拖拽前：
  A(01-01~01-05) →fs→ B(01-06~01-10) →fs→ C(01-11~01-15)

拖拽 A 延后 3 天：
  A(01-04~01-08) →fs→ B(01-09~01-13) →fs→ C(01-14~01-18)
       ↑ 自动顺推         ↑ 自动顺推
```

### 顺推规则

- `fs` 类型：后续任务的开始不会早于前置任务的结束
- `ss` 类型：后续任务的开始不会早于前置任务的开始
- `ff` 类型：后续任务的结束不会早于前置任务的结束
- `sf` 类型：后续任务的结束不会早于前置任务的开始
- 只顺延不提前（拖拽前置提前，后续不会跟着提前）
- 多条前驱取满足全部约束的最大平移量
- 迭代传播至稳定（A→B→C→D 链式传播）

### 使用

```vue
<GanttChart :data="tasks" :links="links" :auto-reschedule="true" />
```

顺推产生的变更通过 `reschedule` 事件通知：

```vue
<GanttChart
  :data="tasks"
  :links="links"
  :auto-reschedule="true"
  @reschedule="onReschedule"
/>
```

```ts
function onReschedule(changes: RescheduleChange[]) {
  for (const c of changes) {
    console.log(`任务 ${c.task.name} 从 ${c.oldStartDate} 顺推到 ${c.task.startDate}`)
  }
  // 批量保存到后端
  api.batchUpdate(changes.map(c => ({
    id: c.task.id,
    startDate: c.task.startDate,
    endDate: c.task.endDate,
  })))
}
```

## 环检测

如果依赖关系形成环路（如 A → B → C → A），组件不会崩溃。内部使用 Kahn 拓扑排序算法进行环检测，检测到环时：

- **依赖顺推**：安全跳过循环部分，不会无限递归
- **关键路径**：返回空集，不会死循环
- **控制台**：输出警告日志

```ts
// 有环的依赖（不推荐，但不会崩溃）
const links = [
  { from: 'A', to: 'B', type: 'fs' },
  { from: 'B', to: 'C', type: 'fs' },
  { from: 'C', to: 'A', type: 'fs' },  // 环！
]
```

## 连线样式

### 自定义颜色

```ts
const links: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs', color: '#3b82f6' },
  { from: 't2', to: 't3', type: 'fs', color: '#ef4444' },  // 红色：关键依赖
]
```

### 关键路径标红

开启 `showCriticalPath` 后，关键路径上的连线自动标红：

```vue
<GanttChart :data="tasks" :links="links" :show-critical-path="true" />
```

## 连线事件

```vue
<GanttChart
  :data="tasks"
  :links="links"
  @link-create="onLinkCreate"
  @link-click="onLinkClick"
  @link-dbl-click="onLinkDblClick"
  @link-delete="onLinkDelete"
/>
```

```ts
// 创建连线
function onLinkCreate(p: { from: string; to: string }) {}

// 点击连线
function onLinkClick(link: GanttLink) {
  console.log('点击:', link.from, '→', link.to)
}

// 双击连线（可用于修改类型或删除）
function onLinkDblClick(link: GanttLink) {
  if (confirm('删除此依赖关系？')) {
    links.value = links.value.filter(l => l !== link)
  }
}

// 删除连线
function onLinkDelete(link: GanttLink) {
  console.log('删除:', link.from, '→', link.to)
}
```

## 双向绑定

```vue
<GanttChart v-model:data="tasks" v-model:links="links" />
```

拖拽创建或删除连线后，`links` 自动更新。

## 实战示例

### 项目排期

```ts
const tasks: GanttTask[] = [
  { id: 'req', name: '需求调研', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
  { id: 'design', name: '方案设计', startDate: '2025-01-06', endDate: '2025-01-12', progress: 80 },
  { id: 'dev', name: '开发实现', startDate: '2025-01-13', endDate: '2025-01-25', progress: 30 },
  { id: 'test', name: '测试验收', startDate: '2025-01-20', endDate: '2025-01-30', progress: 0 },
  // 测试可以在开发还没完成时就开始（ss 依赖）
  { id: 'deploy', name: '上线部署', startDate: '2025-01-31', endDate: '2025-02-02', progress: 0 },
]

const links: GanttLink[] = [
  { from: 'req', to: 'design', type: 'fs' },     // 需求完成 → 设计开始
  { from: 'design', to: 'dev', type: 'fs' },     // 设计完成 → 开发开始
  { from: 'dev', to: 'test', type: 'ss' },       // 开发开始 → 测试开始（并行）
  { from: 'dev', to: 'deploy', type: 'fs' },     // 开发完成 → 部署开始
  { from: 'test', to: 'deploy', type: 'ff' },    // 测试完成 → 部署完成
]
```
