# 多图联动

`GanttSyncHub` 可同步多个 GanttChart 实例的滚动、缩放、选择和展开状态。

## 创建联动中心

```ts
import { createGanttSyncHub } from '@gantt-pro/vue'

const hub = createGanttSyncHub({
  scroll: true,      // 同步滚动（默认 true）
  scale: true,       // 同步缩放（默认 true）
  selection: false,  // 同步选择（默认 false）
  expand: false,     // 同步展开/折叠（默认 false）
})
```

## 联动配置

| 配置项 | 类型 | 默认值 | 效果 |
|---|---|---|---|
| `scroll` | `boolean` | `true` | 滚动任一实例，其他实例水平滚动同步 |
| `scale` | `boolean` | `true` | 刻度切换时，所有实例同步切换 |
| `selection` | `boolean` | `false` | 选中任务时，其他实例同步选中 |
| `expand` | `boolean` | `false` | 展开/折叠时，其他实例同步 |

## 注册实例

每个 GanttChart 实例通过 `register` 注册到联动中心：

```vue
<template>
  <GanttChart
    ref="gantt1"
    :data="data1"
    :scale="scale"
    @scale-change="(s) => hub.onScaleChange(symbol1, s)"
  />
  <GanttChart
    ref="gantt2"
    :data="data2"
    :scale="scale"
    @scale-change="(s) => hub.onScaleChange(symbol2, s)"
  />
</template>
```

## 工作原理

```
实例A 滚动 → hub.onScroll(symbolA, scrollLeft)
                    ↓ 广播
              实例B.setScrollLeft(scrollLeft)
              实例C.setScrollLeft(scrollLeft)

实例B 切换刻度 → hub.onScaleChange(symbolB, 'week')
                       ↓ 广播
                 实例A.setScale('week')
                 实例C.setScale('week')
```

使用 `symbol` 作为实例唯一标识，广播时跳过源实例。内部使用 `syncing` 标志防止递归。

## 典型场景

### 多项目对比

将两个项目的甘特图上下排列，同步滚动和缩放：

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <h3>项目 A</h3>
      <GanttChart
        ref="ganttA"
        :data="projectA"
        :scale="scale"
        @scale-change="onScaleChange"
      />
    </div>
    <div>
      <h3>项目 B</h3>
      <GanttChart
        ref="ganttB"
        :data="projectB"
        :scale="scale"
        @scale-change="onScaleChange"
      />
    </div>
  </div>
</template>
```

### 资源视图与任务视图联动

上方展示资源分配甘特图，下方展示任务甘特图，滚动同步：

```vue
<template>
  <GanttChart
    :data="resourceView"
    :scale="scale"
    :show-resource-panel="true"
  />
  <GanttChart
    :data="taskView"
    :scale="scale"
  />
</template>
```

### 多团队进度对比

```vue
<template>
  <div v-for="team in teams" :key="team.id">
    <h3>{{ team.name }}</h3>
    <GanttChart
      :data="team.tasks"
      :scale="scale"
      @scale-change="onScaleChange"
    />
  </div>
</template>
```

## API

### createGanttSyncHub

```ts
function createGanttSyncHub(config?: GanttSyncConfig): GanttSyncHub
```

### GanttSyncHub

| 方法 | 说明 |
|---|---|
| `register(key, instance)` | 注册实例 |
| `unregister(key)` | 注销实例 |
| `onScroll(source, scrollLeft)` | 滚动同步（source 为源实例标识） |
| `onScaleChange(source, scale)` | 刻度同步 |
| `onSelectionChange(source, id)` | 选择同步 |
| `config` | 联动配置 |
| `syncing` | 是否正在同步中（防止递归） |

### GanttSyncInstance

```ts
interface GanttSyncInstance {
  setScrollLeft: (v: number) => void
  setScrollTop: (v: number) => void
  setScale: (s: ScaleType) => void
  setSelected: (id: string | null) => void
  getScrollLeft: () => number
  getScrollTop: () => number
}
```
