# 关键路径

gantt-pro 内置 CPM（Critical Path Method）算法，可自动计算项目关键路径。

## 什么是关键路径

关键路径是项目中**总工期最长**的任务链路。

**核心概念**：
- **关键路径上的任何任务延期 → 整个项目延期**
- 关键路径上的任务"浮时"（slack/float）为零
- 浮时 = 最晚开始时间 - 最早开始时间
- 浮时为零 → 该任务不能延期 → 是关键任务

### 图示

```
路径1: A(5天) → B(3天) → D(4天) = 12天
路径2: A(5天) → C(7天) → D(4天) = 16天  ← 关键路径（更长）

路径2上的 A、C、D 都是关键任务，浮时为 0
路径1上的 B 有 4 天浮时（可以延期 4 天不影响项目）
```

## 启用关键路径

```vue
<GanttChart :data="tasks" :links="links" :show-critical-path="true" />
```

启用后：
- 关键路径上的**任务条**标红高亮
- 关键路径上的**依赖连线**标红
- 非关键任务保持原色

## 完整示例

```ts
const tasks: GanttTask[] = [
  { id: 'a', name: '需求分析', startDate: '2025-01-01', endDate: '2025-01-05', progress: 100 },
  { id: 'b', name: '方案设计', startDate: '2025-01-06', endDate: '2025-01-10', progress: 80 },
  { id: 'c', name: '核心开发', startDate: '2025-01-06', endDate: '2025-01-15', progress: 30 },
  { id: 'd', name: '集成测试', startDate: '2025-01-16', endDate: '2025-01-22', progress: 0 },
  { id: 'e', name: '上线发布', startDate: '2025-01-23', endDate: '2025-01-25', progress: 0 },
]

const links: GanttLink[] = [
  { from: 'a', to: 'b', type: 'fs' },  // 需求完成 → 设计开始
  { from: 'a', to: 'c', type: 'fs' },  // 需求完成 → 开发开始
  { from: 'b', to: 'd', type: 'fs' },  // 设计完成 → 测试开始
  { from: 'c', to: 'd', type: 'fs' },  // 开发完成 → 测试开始
  { from: 'd', to: 'e', type: 'fs' },  // 测试完成 → 发布开始
]
```

在这个例子中：
- 路径1：`a → b → d → e` = 5+5+7+3 = 20 天
- 路径2：`a → c → d → e` = 5+10+7+3 = 25 天 ← **关键路径**

所以 `a`、`c`、`d`、`e` 会标红，`b` 保持原色。

## 算法说明

### 内部实现步骤

```
1. 拓扑排序（Kahn 算法）
   ├── 构建邻接表
   ├── 计算入度
   ├── BFS 队列处理
   └── 如果排序结果数 ≠ 节点数 → 有环，返回空集

2. 正向遍历（计算最早时间）
   ├── 按拓扑序处理
   ├── ES(最早开始) = max(所有前驱的 EF)
   ├── EF(最早结束) = ES + 工期
   └── 项目最晚完成时间 = max(所有 EF)

3. 逆向遍历（计算最晚时间）
   ├── 按逆拓扑序处理
   ├── LF(最晚完成) = min(所有后继的 LS)
   └── LS(最晚开始) = LF - 工期

4. 计算浮时
   ├── slack = LS - ES = LF - EF
   └── slack ≤ 0 → 关键任务
```

### 纯函数使用

也可以脱离组件直接使用：

```ts
import { computeCriticalIds } from '@gantt-pro/core'

const criticalIds = computeCriticalIds(
  tasks,           // 任务树
  links,           // 依赖连线
  datesOf,         // 日期计算函数
  walk             // 遍历函数
)

console.log('关键任务:', [...criticalIds])
// ['a', 'c', 'd', 'e']
```

### 通过 GanttEngine 获取

```ts
import { GanttEngine } from '@gantt-pro/core'

const engine = new GanttEngine(tasks, options)
engine.options.value = { ...engine.options.value, showCriticalPath: true }

const criticalIds = engine.criticalIds
// Set { 'a', 'c', 'd', 'e' }
```

## 环检测

如果依赖关系存在环路，CPM 算法会安全检测并返回空集：

```ts
// 有环的依赖
const links = [
  { from: 'A', to: 'B', type: 'fs' },
  { from: 'B', to: 'C', type: 'fs' },
  { from: 'C', to: 'A', type: 'fs' },  // 环！
]

const criticalIds = computeCriticalIds(tasks, links, datesOf, walk)
// Set(0) {} ← 空集，不会死循环
```

## 实际应用

### 项目延期预警

```vue
<template>
  <div class="alert" v-if="criticalTasksAtRisk.length">
    ⚠️ {{ criticalTasksAtRisk.length }} 个关键任务有延期风险
  </div>
  <GanttChart :data="tasks" :links="links" :show-critical-path="true" />
</template>

<script setup>
const criticalTasksAtRisk = computed(() => {
  return tasks.value.filter(t =>
    engine.criticalIds.has(t.id) &&
    t.progress < 50 &&
    new Date(t.endDate) < new Date()
  )
})
</script>
```

### 配合基准线

```vue
<GanttChart
  :data="tasks"
  :links="links"
  :show-critical-path="true"
  :show-baseline="true"
/>
```

关键路径 + 基准线一起开启，可以直观看到：
- 哪些任务是关键任务（标红）
- 关键任务是否已经延期（基准线对比）
- 延期的关键任务最需要关注
