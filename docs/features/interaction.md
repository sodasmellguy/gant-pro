# 任务条交互

gantt-pro 提供丰富的拖拽交互能力。本页详细介绍所有交互方式。

<GanttDemo />

## 交互总览

| 交互 | 说明 | 默认 |
|---|---|---|
| 拖拽移动 | 拖拽条形改变任务时间 | ✅ |
| 左端缩放 | 拖拽条形左端改变开始日期 | ✅ |
| 右端缩放 | 拖拽条形右端改变结束日期 | ✅ |
| 拖拽进度 | 拖拽进度圆点改变完成度 | ✅ |
| 行拖拽排序 | 拖拽行改变顺序 | ❌ 需开启 |
| 行内编辑 | 双击单元格修改 | ❌ 需开启 |
| 右键菜单 | 右键弹出操作菜单 | ❌ 需开启 |
| 创建连线 | 从锚点拖拽到另一任务 | ✅ |
| Ctrl+滚轮缩放 | 逐级切换刻度 | ✅ |

## 拖拽移动

直接拖拽任务条中间部分可改变任务时间：

```
  ┌──────────────────┐
  │     拖拽我        │  ← 按住中间拖动
  └──────────────────┘
```

```vue
<!-- 默认启用 -->
<GanttChart :data="tasks" />
```

## 左右端缩放

拖拽任务条的左右边缘可改变持续时间：

```
  ┌──────────────────┐
  ╞══════════════════╡  ← ╞ 左端手柄，╡ 右端手柄
  └──────────────────┘
```

条形两端有手柄（handle）指示器，鼠标移上去会变为 resize 光标。

## 拖拽进度

拖拽任务条顶部的进度圆点可改变进度值：

```
     ●——————  ← 拖拽此圆点改变进度
██████████░░░░░░
         50%
```

## 父子联动缩放

开启 `linkedResize` 后：

- 拖拽叶子任务时，父汇总条自动扩展
- 拖拽汇总条时，子任务跟随移动

```vue
<GanttChart :data="tasks" :linked-resize="true" />
```

## 按单位移动

开启 `moveByUnit` 后，拖拽时吸附到刻度网格（不会出现半天、半周的位置）：

```vue
<GanttChart :data="tasks" :move-by-unit="true" />
```

## 吸附对齐

拖拽时按步长吸附到日期：

```vue
<!-- 基本吸附（默认 1 天/小时） -->
<GanttChart :data="tasks" :snap="true" />

<!-- 自定义吸附 -->
<GanttChart
  :data="tasks"
  :snap="{
    enabled: true,
    step: 2,        // 每 2 天吸附一次
    showGuide: true // 显示吸附参考线
  }"
/>
```

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用吸附 |
| `step` | `number` | `1` | 步长（天；小时刻度下为小时） |
| `showGuide` | `boolean` | `true` | 显示吸附参考线 |

::: tip snap vs moveByUnit
- `snap`：拖拽结束后吸附到最近的步长位置
- `moveByUnit`：拖拽过程中实时吸附到刻度网格
:::

## 只读模式

禁用所有拖拽和连线创建：

```vue
<GanttChart :data="tasks" :readonly="true" />
```

只读模式下：
- ❌ 无法拖拽移动/缩放/改进度
- ❌ 无法创建依赖连线
- ❌ 无法行内编辑
- ✅ 可以展开/折叠
- ✅ 可以点击/选择
- ✅ 可以右键菜单（如果开启）

## 行内编辑

双击任务名称或进度单元格可直接编辑：

```vue
<GanttChart :data="tasks" :editable="true" />
```

编辑后的值会通过 `task-change` 事件通知（`mode: 'edit'`）：

```vue
<GanttChart :data="tasks" :editable="true" @task-change="onTaskChange" />
```

```ts
function onTaskChange(payload: TaskChangePayload) {
  if (payload.mode === 'edit') {
    console.log('名称从', payload.oldName, '改为', payload.task.name)
  }
}
```

## 行拖拽排序

```vue
<GanttChart :data="tasks" :row-draggable="true" />
```

开启后，行左侧出现拖拽手柄，可拖拽改变任务顺序。排序事件：

```vue
<GanttChart :data="tasks" :row-draggable="true" @row-move="onRowMove" />
```

```ts
function onRowMove(payload: RowMovePayload) {
  console.log(`任务 ${payload.task.name} 从 ${payload.fromIndex} 移到 ${payload.toIndex}`)
  console.log(`父任务: ${payload.parentId ?? '根级'}`)
}
```

## 右键菜单

传入 `true` 使用内置菜单，传入回调函数则自定义：

```vue
<!-- 内置菜单（删除任务/添加依赖/复制日期/吸附位置） -->
<GanttChart :data="tasks" :context-menu="true" />

<!-- 自定义菜单 -->
<GanttChart :data="tasks" :context-menu="handleContextMenu" />
```

```ts
function handleContextMenu(task: GanttTask, e: MouseEvent) {
  // 弹出你的自定义菜单
  showCustomMenu({
    x: e.clientX,
    y: e.clientY,
    items: [
      { label: '编辑', action: () => editTask(task) },
      { label: '删除', action: () => deleteTask(task) },
      { label: '复制', action: () => copyTask(task) },
    ],
  })
}
```

也可以监听 `context-menu` 事件：

```vue
<GanttChart :data="tasks" @context-menu="onContextMenu" />
```

```ts
function onContextMenu(payload: { task: GanttTask; x: number; y: number }) {
  // payload.x / payload.y 是鼠标位置
}
```

## 条形对齐

控制任务条在行内的垂直对齐方式：

```vue
<GanttChart :data="tasks" bar-alignment="center" />
```

| 值 | 效果 |
|---|---|
| `center`（默认） | 条形垂直居中于行 |
| `left` | 条形贴行顶部 |
| `right` | 条形贴行底部 |

## 视口外定位

当任务在可视区域外时，时间线边缘显示箭头指示器，点击可跳转到该任务：

```vue
<GanttChart :data="tasks" :off-screen-indicator="true" />
```

```
◀ 3个任务在左侧    │  可视区域  │    2个任务在右侧 ▶
```

## 点击行滚入视图

点击左侧表格行时，右侧时间线条形自动滚动到可见区：

```vue
<GanttChart :data="tasks" :slider-into-view="true" />
```

## 悬停高亮

悬停行时高亮对应的时间刻度格：

```vue
<GanttChart :data="tasks" :highlight-date="true" />
```

## 事件监听

所有交互事件：

```vue
<GanttChart
  :data="tasks"
  @task-change="onTaskChange"
  @task-click="onTaskClick"
  @row-click="onRowClick"
  @row-dbl-click="onRowDblClick"
  @row-move="onRowMove"
  @expand="onExpand"
/>
```

```ts
// 任务拖拽/编辑后
function onTaskChange(p: TaskChangePayload) {
  console.log('mode:', p.mode)  // 'move' | 'left' | 'right' | 'progress' | 'edit'
  console.log('旧日期:', p.oldStartDate, p.oldEndDate)
  console.log('新日期:', p.task.startDate, p.task.endDate)
}

// 点击任务条
function onTaskClick(task: GanttTask) {
  console.log('点击:', task.name)
}

// 点击行
function onRowClick(task: GanttTask) {
  console.log('点击行:', task.name)
}

// 展开/折叠
function onExpand(task: GanttTask, expanded: boolean) {
  console.log(task.name, expanded ? '展开' : '折叠')
}
```
