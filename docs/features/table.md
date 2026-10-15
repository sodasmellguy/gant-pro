# 表格与列

左侧表格区域支持丰富的列配置能力。本页详细介绍所有表格功能。

## 默认列

不传 `columns` 时，使用默认配置：

| 列 | key | 宽度 | 对齐 |
|---|---|---|---|
| 任务名称 | `name` | 220px | left |
| 开始日期 | `startDate` | 88px | center |
| 结束日期 | `endDate` | 88px | center |
| 负责人 | `owner` | 76px | center |
| 进度 | `progress` | 70px | center |

## 自定义列

```ts
const columns: GanttColumn[] = [
  { key: 'name', label: '任务', width: 200 },
  { key: 'startDate', label: '开始', width: 100, align: 'center' },
  { key: 'endDate', label: '结束', width: 100, align: 'center' },
  { key: 'owner', label: '负责人', width: 80, align: 'center' },
  { key: 'progress', label: '进度', width: 80, align: 'right' },
]
```

```vue
<GanttChart :data="tasks" :columns="columns" />
```

### 列属性

| 属性 | 类型 | 说明 |
|---|---|---|
| `key` | `string` | 对应 GanttTask 的字段名 |
| `label` | `string` | 表头标题 |
| `width` | `number` | 列宽（px） |
| `align` | `'left' \| 'center' \| 'right'` | 对齐方式 |
| `children` | `GanttColumn[]` | 子列（多级表头） |
| `mergeCell` | `boolean` | 合并相同值单元格 |

## 多级嵌套表头

通过 `children` 配置子列，实现多级表头：

```ts
const columns: GanttColumn[] = [
  { key: 'name', label: '任务名称', width: 220 },
  {
    key: 'date',
    label: '日期信息',
    width: 200,
    align: 'center',
    children: [
      { key: 'startDate', label: '开始', width: 100, align: 'center' },
      { key: 'endDate', label: '结束', width: 100, align: 'center' },
    ],
  },
  {
    key: 'resource',
    label: '资源',
    width: 160,
    align: 'center',
    children: [
      { key: 'owner', label: '负责人', width: 80, align: 'center' },
      { key: 'progress', label: '进度', width: 80, align: 'center' },
    ],
  },
]
```

渲染效果：

```
┌──────────┬─────日期信息─────┬────资源────┐
│ 任务名称  │  开始  │  结束   │ 负责人 │进度│
├──────────┼────────┼─────────┼───────┼────┤
│ 需求分析  │ 01-01  │ 01-05   │ 张三   │100%│
```

## 单元格合并

设置 `mergeCell: true` 后，同列相邻行相同值时自动合并为一个单元格：

```ts
const columns: GanttColumn[] = [
  { key: 'department', label: '部门', width: 120, mergeCell: true },
  { key: 'name', label: '任务', width: 200 },
  { key: 'startDate', label: '开始', width: 100, align: 'center' },
]
```

效果：

```
┌────────┬──────────┬──────┐
│ 研发部  │ 需求分析  │01-01 │ ← 研发部合并
│        │ 详细设计  │01-06 │
│        │ 开发实现  │01-14 │
├────────┼──────────┼──────┤
│ 测试部  │ 测试用例  │01-20 │ ← 测试部合并
│        │ 验收测试  │01-25 │
└────────┴──────────┴──────┘
```

## 列宽拖拽调整

```vue
<GanttChart :data="tasks" :resizable-columns="true" />
```

开启后，表头列边界可拖拽调宽。鼠标移到列边界会显示 resize 光标。

## Checkbox 选择列

```vue
<GanttChart :data="tasks" :show-checkbox="true" />
```

显示 Checkbox 列，支持：
- 单行勾选/取消
- 全选/取消全选（表头 Checkbox）
- 半选状态（部分行选中时）

选中变化事件：

```vue
<GanttChart :data="tasks" :show-checkbox="true" @selection-change="onSelectionChange" />
```

```ts
function onSelectionChange(ids: string[]) {
  console.log('选中:', ids)
}
```

通过 ref 操作选择：

```ts
// 获取选中集合
const selected = ganttRef.value?.getSelected()  // Set<string>

// 全选
ganttRef.value?.selectAll(true)

// 取消全选
ganttRef.value?.selectAll(false)
```

## 日期格式

控制表格中日期列的显示格式：

```vue
<GanttChart :data="tasks" date-format="MM-DD" />
```

| 格式 | 显示效果 | 说明 |
|---|---|---|
| `'MM-DD'`（默认） | 01-15 | 月-日 |
| `'YYYY-MM-DD'` | 2025-01-15 | 完整日期 |
| `'MM/DD'` | 01/15 | 斜杠分隔 |
| `'DD/MM'` | 15/01 | 日-月 |

支持的占位符：`YYYY`、`MM`、`DD`、`HH`、`mm`。

## 进度小数位

```vue
<GanttChart :data="tasks" :progress-decimal="1" />
```

| 值 | 显示效果 |
|---|---|
| `0`（默认） | `55%` |
| `1` | `55.3%` |
| `2` | `55.32%` |

## 搜索高亮

```vue
<GanttChart :data="tasks" search="需求" />
```

匹配名称的任务行会高亮显示。可以配合搜索框：

```vue
<template>
  <input v-model="keyword" placeholder="搜索任务..." />
  <GanttChart :data="tasks" :search="keyword" />
</template>
```

## 负责人筛选

只显示该负责人的任务及其父任务链：

```vue
<template>
  <select v-model="ownerFilter">
    <option :value="null">全部</option>
    <option v-for="o in owners" :key="o" :value="o">{{ o }}</option>
  </select>
  <GanttChart :data="tasks" :filter-owner="ownerFilter" />
</template>
```

## 分隔线

```vue
<GanttChart :data="tasks" :show-divider="true" />
```

在表格和时间线交界处显示竖向分隔线。

## 层级行背景色

不同层级的任务行使用不同背景色：

```vue
<!-- 使用默认层级色 -->
<GanttChart :data="tasks" :level-color="true" />

<!-- 自定义层级色 -->
<GanttChart
  :data="tasks"
  :level-color="['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc']"
/>
```

默认色板通过 CSS 变量 `--gt-level-0` ~ `--gt-level-3` 控制。

## 空数据提示

```vue
<GanttChart :data="[]" empty-data="暂无任务数据" />
```

## 表格插槽（Vue）

### 表头插槽

```vue
<GanttChart :data="tasks">
  <template #header-name="{ column }">
    <span style="color: #3b82f6;">{{ column.label }}</span>
  </template>
</GanttChart>
```

### 单元格插槽

```vue
<GanttChart :data="tasks">
  <!-- 任务名称列（特殊） -->
  <template #col-name="{ task, depth, summary }">
    <span :style="{ paddingLeft: depth * 16 + 'px' }">
      {{ task.name }}
    </span>
  </template>

  <!-- 通用列 -->
  <template #col-owner="{ task }">
    <span v-if="task.owner">
      {{ typeof task.owner === 'string' ? task.owner : task.owner.name }}
    </span>
  </template>

  <template #col-progress="{ task }">
    <div class="progress-bar">
      <div :style="{ width: (task.progress || 0) + '%' }" />
      <span>{{ task.progress || 0 }}%</span>
    </div>
  </template>
</GanttChart>
```

### 插槽参数

| 插槽 | 参数 |
|---|---|
| `header-{key}` | `column: GanttColumn` |
| `col-name` | `task, depth, summary` |
| `col-{key}` | `task, depth, summary` |
