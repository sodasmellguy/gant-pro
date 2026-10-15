# Props

## 数据相关

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `data` | `GanttTask[]` | — | 任务树（必填），支持 `v-model:data` |
| `links` | `GanttLink[]` | `[]` | 依赖连线，支持 `v-model:links` |
| `columns` | `GanttColumn[]` | 见下文 | 左侧表格列配置 |
| `fieldMap` | `Partial<FieldMap>` | `{}` | 字段映射，适配既有数据结构 |

## 视觉与布局

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `scale` | `ScaleType` | `'day'` | 时间刻度，支持 `v-model:scale` |
| `rowHeight` | `number` | `36` | 行高（px） |
| `barHeight` | `number` | `24` | 条形高度（px） |
| `headerHeight` | `number` | `56` | 表头高度（px） |
| `dark` | `boolean` | `false` | 暗色模式 |
| `theme` | `'blue' \| 'green' \| 'purple' \| 'orange'` | `'blue'` | 主题预设 |
| `primaryColor` | `string` | `''` | 自定义主色 |
| `levelColor` | `boolean \| string[]` | `false` | 层级行背景色 |
| `headerStyle` | `HeaderStyle` | `{}` | 表头样式 |
| `bodyStyle` | `BodyStyle` | `{}` | 行体样式 |
| `progressColor` | `string` | `''` | 进度条颜色 |
| `barAlignment` | `'left' \| 'center' \| 'right'` | `'center'` | 条形对齐 |

## 交互行为

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `readonly` | `boolean` | `false` | 只读模式 |
| `editable` | `boolean` | `false` | 行内编辑 |
| `allowLink` | `boolean` | `true` | 允许拖拽创建连线 |
| `zoomOnWheel` | `boolean` | `true` | Ctrl + 滚轮缩放 |
| `linkedResize` | `boolean` | `false` | 父子联动缩放 |
| `rowDraggable` | `boolean` | `false` | 行拖拽排序 |
| `snap` | `boolean \| SnapConfig` | `true` | 吸附对齐 |
| `moveByUnit` | `boolean` | `false` | 按刻度单位移动 |
| `contextMenu` | `boolean \| ((task, e) => void)` | `false` | 右键菜单 |
| `barSlot` | `boolean` | `false` | 条形内容插槽模式 |

## 功能开关

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `showBaseline` | `boolean` | `false` | 显示基准线 |
| `autoReschedule` | `boolean` | `false` | 依赖顺推 |
| `showCriticalPath` | `boolean` | `false` | 关键路径高亮 |
| `showExpectedProgress` | `boolean` | `false` | 预期进度对比 |
| `showToday` | `boolean` | `true` | 显示今日线 |
| `showWeekend` | `boolean` | `true` | 周末高亮 |
| `showCheckbox` | `boolean` | `false` | Checkbox 选择列 |
| `showDivider` | `boolean` | `true` | 表格/时间区分隔线 |
| `resizableColumns` | `boolean` | `false` | 列宽拖拽调整 |
| `sliderIntoView` | `boolean` | `false` | 点击行滚入视图 |
| `offScreenIndicator` | `boolean` | `true` | 视口外定位指示器 |
| `showResourcePanel` | `boolean` | `false` | 资源面板 |
| `rowDblClick` | `boolean` | `false` | 行双击事件 |
| `highlightDate` | `boolean` | `false` | 悬停高亮刻度格 |

## 刻度与时间

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `hourWidth` | `number` | `24` | 小时刻度每小时像素宽 |
| `customScale` | `{ step?: number; labelFormat?: string } \| false` | `false` | 自定义刻度 |
| `rangeStart` | `string \| Date \| null` | `null` | 时间范围起始 |
| `rangeEnd` | `string \| Date \| null` | `null` | 时间范围结束 |
| `infinitePadding` | `number \| false` | `30` | 无限滚动缓冲天数 |

## 国际化与格式

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `locale` | `GanttLocale` | `'zh-CN'` | 语言 |
| `labels` | `Partial<GanttLabels>` | `{}` | 标签覆盖 |
| `dateFormat` | `string` | `'MM-DD'` | 日期格式 |
| `progressDecimal` | `number` | `0` | 进度小数位 |
| `emptyData` | `string` | `''` | 空数据提示 |
| `search` | `string` | `''` | 搜索关键词 |

## 筛选

| 属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `filterOwner` | `string \| null` | `null` | 负责人筛选 |
| `holidays` | `HolidayItem[]` | `[]` | 自定义假日 |

## 默认 columns

```ts
[
  { key: 'name', label: '任务名称', width: 220 },
  { key: 'startDate', label: '开始日期', width: 88, align: 'center' },
  { key: 'endDate', label: '结束日期', width: 88, align: 'center' },
  { key: 'owner', label: '负责人', width: 76, align: 'center' },
  { key: 'progress', label: '进度', width: 70, align: 'center' },
]
```
