# 主题与暗色模式

gantt-pro 使用 CSS 变量驱动的主题系统，支持暗色模式、主题预设和完全自定义。

## 主题预设

内置 4 种主题预设，一键切换：

```vue
<GanttChart :data="tasks" theme="blue" />
```

| 主题 | 主色 | 预览 | 适用场景 |
|---|---|---|---|
| `blue` | `#3b82f6` | 🔵 | 默认，通用项目管理 |
| `green` | `#10b981` | 🟢 | 进度健康、绿色项目 |
| `purple` | `#8b5cf6` | 🟣 | 创意设计类项目 |
| `orange` | `#f59e0b` | 🟠 | 风险监控类项目 |

## 暗色模式

```vue
<GanttChart :data="tasks" :dark="true" />
```

暗色模式下自动切换：
- 背景色 → 深色
- 文字色 → 浅色
- 网格线 → 低对比度
- 周末/假日背景 → 更深的灰色

### 跟随系统偏好

```ts
// 检测系统暗色偏好
const dark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

// 监听变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  dark.value = e.matches
})
```

```vue
<GanttChart :data="tasks" :dark="dark" />
```

### 使用 @vueuse/core

```ts
import { useDark } from '@vueuse/core'

const isDark = useDark()
```

```vue
<GanttChart :data="tasks" :dark="isDark" />
```

## 自定义主色

```vue
<GanttChart :data="tasks" primary-color="#e11d48" />
```

自定义主色会覆盖主题预设的主色。支持任何 CSS 颜色格式：

```vue
<GanttChart :data="tasks" primary-color="#e11d48" />        <!-- 十六进制 -->
<GanttChart :data="tasks" primary-color="rgb(225, 29, 72)" /> <!-- RGB -->
<GanttChart :data="tasks" primary-color="var(--my-brand)" />  <!-- CSS 变量 -->
```

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

默认色板通过 CSS 变量控制：

```css
:root {
  --gt-level-0: #ffffff;  /* 第0层 */
  --gt-level-1: #f8fafc;  /* 第1层 */
  --gt-level-2: #f1f5f9;  /* 第2层 */
  --gt-level-3: #e2e8f0;  /* 第3层 */
}
```

## 表头样式

```ts
const headerStyle = {
  bgColor: '#1e293b',   // 表头背景色
  textColor: '#f8fafc', // 表头文字色
}
```

```vue
<GanttChart :data="tasks" :header-style="headerStyle" />
```

## 行体样式

```ts
const bodyStyle = {
  bgColor: '#ffffff',      // 行背景色
  hoverColor: '#f1f5f9',   // 悬停背景色
  selectColor: '#dbeafe',  // 选中背景色
  textColor: '#1e293b',    // 文字颜色
  todayColor: '#ef4444',   // 今日线颜色
  weekendColor: '#f8fafc', // 周末背景色
}
```

```vue
<GanttChart :data="tasks" :body-style="bodyStyle" />
```

## 进度条颜色

```vue
<GanttChart :data="tasks" progress-color="#10b981" />
```

## 任务条颜色

单个任务可自定义条形颜色：

```ts
const tasks: GanttTask[] = [
  { id: 't1', name: '紧急任务', startDate: '2025-01-01', endDate: '2025-01-05', color: '#ef4444' },
  { id: 't2', name: '普通任务', startDate: '2025-01-06', endDate: '2025-01-10', color: '#3b82f6' },
  { id: 't3', name: '已完成', startDate: '2025-01-11', endDate: '2025-01-15', color: '#10b981' },
]
```

### 动态颜色

根据进度动态设置颜色：

```ts
const tasks = computed(() => rawData.value.map(t => ({
  ...t,
  color: t.progress >= 100 ? '#10b981'   // 完成 → 绿色
       : t.progress > 0   ? '#3b82f6'    // 进行中 → 蓝色
       :                      '#94a3b8'  // 未开始 → 灰色
})))
```

## 条形动效

每个任务可独立设置动效：

```ts
{ barEffect: 'shimmer' }  // 闪光扫过效果
{ barEffect: 'pulse' }    // 脉冲呼吸效果
{ barEffect: 'flow' }     // 流动渐变效果
```

| 效果 | 说明 | 适用场景 |
|---|---|---|
| `shimmer` | 高光从左到右扫过 | 进行中的任务 |
| `pulse` | 整个条形呼吸闪烁 | 紧急/阻塞任务 |
| `flow` | 渐变条纹流动 | 持续性任务 |

## 今日线与周末

```vue
<GanttChart
  :data="tasks"
  :show-today="true"     <!-- 今日竖线 -->
  :show-weekend="true"   <!-- 周末灰背景 -->
/>
```

## CSS 变量完整列表

所有视觉属性都通过 CSS 变量控制，可直接在全局样式中覆盖：

```css
:root {
  /* 主色 */
  --gt-primary: #3b82f6;

  /* 背景 */
  --gt-bg: #ffffff;
  --gt-header-bg: #f8fafc;

  /* 文字 */
  --gt-text: #1e293b;
  --gt-text-2: #64748b;
  --gt-header-text: #475569;
  --gt-bar-text: #ffffff;

  /* 边框/网格 */
  --gt-border: #e2e8f0;

  /* 交互态 */
  --gt-row-hover: #f1f5f9;
  --gt-row-selected: #dbeafe;

  /* 特殊颜色 */
  --gt-today: #ef4444;
  --gt-weekend: #f8fafc;
  --gt-danger: #ef4444;

  /* 条形 */
  --gt-bar: #3b82f6;
  --gt-milestone: #8b5cf6;
  --gt-link: #94a3b8;
  --gt-progress-fill: rgba(255,255,255,0.3);

  /* 层级色 */
  --gt-level-0: #ffffff;
  --gt-level-1: #f8fafc;
  --gt-level-2: #f1f5f9;
  --gt-level-3: #e2e8f0;

  /* Tooltip */
  --gt-tooltip-bg: #1e293b;
  --gt-tooltip-border: #334155;
}
```

### 暗色模式覆盖

```css
.dark {
  --gt-bg: #0f172a;
  --gt-header-bg: #1e293b;
  --gt-text: #f1f5f9;
  --gt-text-2: #94a3b8;
  --gt-border: #334155;
  --gt-row-hover: #1e293b;
  --gt-row-selected: #1e3a5f;
  --gt-weekend: #1e293b;
  --gt-level-0: #0f172a;
  --gt-level-1: #1e293b;
  --gt-level-2: #334155;
  --gt-level-3: #475569;
}
```

## 自定义主题示例

### 企业品牌主题

```css
:root {
  --gt-primary: #e11d48;  /* 品牌红 */
  --gt-bar: #e11d48;
  --gt-row-selected: #fef2f2;
  --gt-today: #e11d48;
}
```

### 高对比度主题

```css
:root {
  --gt-bg: #000000;
  --gt-text: #ffffff;
  --gt-border: #444444;
  --gt-bar: #ffff00;
  --gt-bar-text: #000000;
  --gt-today: #ff0000;
  --gt-link: #00ffff;
}
```
