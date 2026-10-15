# 数据模型

gantt-pro 使用树形数据结构来表示任务层级关系。本页详细说明所有字段。

## GanttTask 完整定义

```ts
interface GanttTask {
  id: string                    // 唯一标识（必填）
  name: string                  // 任务名称（必填）
  startDate?: string | Date     // 开始日期
  endDate?: string | Date       // 结束日期
  baselineStart?: string | Date // 计划开始（基准线）
  baselineEnd?: string | Date   // 计划结束（基准线）
  owner?: string | { name: string; color?: string }  // 负责人
  progress?: number             // 进度 0-100
  milestone?: boolean           // 是否里程碑
  collapsed?: boolean           // 初始是否折叠
  color?: string                // 自定义条形颜色
  barEffect?: 'shimmer' | 'pulse' | 'flow'  // 条形动效
  status?: 'planned' | 'active' | 'blocked' | 'done'  // 任务状态
  expectedProgress?: number     // 预期进度 0-100
  segments?: TaskSegment[]      // 任务分段
  resources?: ResourceAssignment[]  // 资源分配
  children?: GanttTask[]        // 子任务
  [key: string]: any            // 允许自定义扩展字段
}
```

## 日期格式

### 日级刻度

```ts
{
  startDate: '2025-01-01',     // YYYY-MM-DD
  endDate: '2025-01-05',
}
```

### 小时级刻度

小时刻度支持带时间的格式：

```ts
{
  startDate: '2025-01-15T09:00',  // YYYY-MM-DDTHH:mm
  endDate: '2025-01-15T17:30',
}
```

### Date 对象

也支持原生 Date 对象：

```ts
{
  startDate: new Date(2025, 0, 1),
  endDate: new Date(2025, 0, 5),
}
```

::: warning 不支持的格式
- `'2025/01/01'`（用 / 分隔）
- `'Jan 1, 2025'`（英文格式）
- `'2025-01-01T00:00:00.000Z'`（ISO UTC 格式可能导致时区偏移）
:::

## 基础任务

最简单的任务只需要 `id`、`name`、`startDate`、`endDate`：

```ts
const tasks: GanttTask[] = [
  {
    id: 't1',
    name: '需求分析',
    startDate: '2025-01-01',
    endDate: '2025-01-05',
    progress: 100,
  },
]
```

## 嵌套任务（树形结构）

通过 `children` 字段嵌套，父任务会自动作为**汇总任务**：

```ts
const tasks: GanttTask[] = [
  {
    id: 'phase1',
    name: '第一阶段',
    children: [
      { id: 't1', name: '任务A', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
      { id: 't2', name: '任务B', startDate: '2025-01-06', endDate: '2025-01-10', progress: 50 },
      {
        id: 'sub1',
        name: '子阶段',
        children: [
          { id: 't3', name: '任务C', startDate: '2025-01-11', endDate: '2025-01-15', progress: 0 },
        ],
      },
    ],
  },
]
```

### 汇总任务自动计算

父任务不需要设置 `startDate` / `endDate` / `progress`，会自动计算：

- **日期范围**：取所有子任务的最早开始和最晚结束
- **进度**：所有叶子任务进度的平均值

```
第一阶段 (自动: 01-01 ~ 01-15, 进度: 50%)        ← 汇总行
├── 任务A (01-01 ~ 01-05, 100%)                  ← 叶子
├── 任务B (01-06 ~ 01-10, 50%)                   ← 叶子
└── 子阶段 (自动: 01-11 ~ 01-15, 进度: 0%)        ← 汇总行
    └── 任务C (01-11 ~ 01-15, 0%)                ← 叶子
```

## 里程碑

设置 `milestone: true`，任务渲染为菱形，不需要 `endDate`：

```ts
{
  id: 'm1',
  name: '版本发布',
  startDate: '2025-01-15',
  milestone: true,
}
```

## 负责人

`owner` 支持两种格式：

```ts
// 字符串
{ owner: '张三' }

// 带颜色对象（条形上会显示颜色标记）
{ owner: { name: '张三', color: '#3b82f6' } }
```

## 任务状态

```ts
{
  status: 'planned'  // 计划中（灰色）
  // status: 'active'  // 进行中（蓝色）
  // status: 'blocked' // 阻塞（红色）
  // status: 'done'    // 已完成（绿色）
}
```

## 任务分段

一个任务可以拆成多段渲染（如中断后继续）。设置 `segments` 后，条形会分段显示：

```ts
{
  id: 't1',
  name: '中断后继续的任务',
  startDate: '2025-01-01',    // 总体范围
  endDate: '2025-01-15',
  segments: [
    { startDate: '2025-01-01', endDate: '2025-01-05', progress: 100, color: '#3b82f6' },
    // 01-06 ~ 01-09 中断
    { startDate: '2025-01-10', endDate: '2025-01-15', progress: 0, color: '#94a3b8' },
  ],
}
```

## 资源分配

一个任务可以分配多个资源，在资源面板中展示：

```ts
{
  id: 't1',
  name: '开发任务',
  startDate: '2025-01-01',
  endDate: '2025-01-10',
  resources: [
    { name: '张三', allocation: 80, color: '#3b82f6' },
    { name: '李四', allocation: 50, color: '#8b5cf6' },
  ],
}
```

## 条形动效

每个任务可独立设置动效：

```ts
{ barEffect: 'shimmer' }  // 闪光扫过
{ barEffect: 'pulse' }    // 脉冲呼吸
{ barEffect: 'flow' }     // 流动渐变
```

## 基准线字段

配合 `showBaseline` 使用，记录计划日期：

```ts
{
  id: 't1',
  name: '需求分析',
  startDate: '2025-01-03',     // 实际开始（比计划晚2天）
  endDate: '2025-01-08',       // 实际结束
  baselineStart: '2025-01-01', // 计划开始
  baselineEnd: '2025-01-05',   // 计划结束
}
```

## 预期进度

配合 `showExpectedProgress` 使用，在条形上显示预期进度标记线：

```ts
{
  id: 't1',
  name: '开发任务',
  startDate: '2025-01-01',
  endDate: '2025-01-10',
  progress: 30,           // 实际进度 30%
  expectedProgress: 50,   // 预期进度 50%（落后了）
}
```

## 字段映射

如果你的数据字段名不同，用 `fieldMap` 映射，无需改造数据：

```ts
// 后端数据
const apiData = [
  { task_id: '1', title: '需求分析', begin: '2025-01-01', finish: '2025-01-05', pct: 50 }
]

// 映射
<GanttChart
  :data="apiData"
  :field-map="{
    id: 'task_id',
    name: 'title',
    start: 'begin',
    end: 'finish',
    progress: 'pct',
    children: 'sub_tasks'
  }"
/>
```

支持的字段映射：

| 映射 key | 默认字段 | 说明 |
|---|---|---|
| `id` | `id` | 唯一标识 |
| `name` | `name` | 任务名称 |
| `start` | `startDate` | 开始日期 |
| `end` | `endDate` | 结束日期 |
| `progress` | `progress` | 进度 |
| `children` | `children` | 子任务 |

## 自定义元数据

`GanttTask` 允许任意扩展字段（`[key: string]: any`）：

```ts
{
  id: 't1',
  name: '任务',
  startDate: '2025-01-01',
  endDate: '2025-01-05',
  // 自定义字段
  department: '研发部',
  priority: 'high',
  estimatedHours: 40,
  tags: ['前端', '紧急'],
}
```

自定义字段可以在插槽中访问：

```vue
<template #col-name="{ task }">
  {{ task.name }}
  <span v-if="task.priority === 'high'" class="badge urgent">紧急</span>
  <span v-for="tag in task.tags" :key="tag" class="tag">{{ tag }}</span>
</template>
```

## GanttLink 依赖连线

```ts
interface GanttLink {
  from: string              // 前置任务 ID
  to: string                // 后续任务 ID
  type?: LinkType           // 依赖类型，默认 'fs'
  color?: string            // 自定义颜色
}
```

```ts
const links: GanttLink[] = [
  { from: 't1', to: 't2', type: 'fs' },               // 基本用法
  { from: 't2', to: 't3', type: 'ss', color: '#ef4444' }, // 自定义颜色
]
```

## GanttColumn 列配置

```ts
interface GanttColumn {
  key: string               // 对应 GanttTask 的字段名
  label: string             // 表头标题
  width: number             // 列宽（px）
  align?: 'left' | 'center' | 'right'  // 对齐方式
  children?: GanttColumn[]  // 子列（多级表头）
  mergeCell?: boolean       // 合并相同值的单元格
}
```
