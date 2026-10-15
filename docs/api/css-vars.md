# CSS 变量

gantt-pro 所有视觉属性通过 CSS 变量驱动，可直接覆盖实现自定义主题。

## 主色系

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-primary` | `#3b82f6` | 主色（影响条形、选中态等） |
| `--gt-bar` | `#3b82f6` | 任务条颜色 |
| `--gt-milestone` | `#8b5cf6` | 里程碑菱形颜色 |
| `--gt-link` | `#94a3b8` | 依赖连线颜色 |
| `--gt-danger` | `#ef4444` | 危险/延期色 |
| `--gt-progress-fill` | `rgba(255,255,255,0.3)` | 进度条填充色 |

## 背景与文字

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-bg` | `#ffffff` | 组件背景色 |
| `--gt-header-bg` | `#f8fafc` | 表头背景色 |
| `--gt-text` | `#1e293b` | 主文字色 |
| `--gt-text-2` | `#64748b` | 次要文字色 |
| `--gt-header-text` | `#475569` | 表头文字色 |
| `--gt-bar-text` | `#ffffff` | 条形内文字色 |

## 边框与网格

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-border` | `#e2e8f0` | 边框/网格线颜色 |

## 交互态

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-row-hover` | `#f1f5f9` | 行悬停背景色 |
| `--gt-row-selected` | `#dbeafe` | 行选中背景色 |

## 特殊标记

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-today` | `#ef4444` | 今日线颜色 |
| `--gt-weekend` | `#f8fafc` | 周末背景色 |

## 层级色

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-level-0` | `#ffffff` | 第 0 层背景 |
| `--gt-level-1` | `#f8fafc` | 第 1 层背景 |
| `--gt-level-2` | `#f1f5f9` | 第 2 层背景 |
| `--gt-level-3` | `#e2e8f0` | 第 3 层背景 |

## Tooltip

| 变量 | 默认值 | 说明 |
|---|---|---|
| `--gt-tooltip-bg` | `#1e293b` | 提示框背景 |
| `--gt-tooltip-border` | `#334155` | 提示框边框 |

## 覆盖方式

### 全局覆盖

在全局 CSS 中覆盖：

```css
:root {
  --gt-primary: #e11d48;
  --gt-bar: #e11d48;
}
```

### 局部覆盖

在特定容器内覆盖：

```css
.my-gantt-theme {
  --gt-primary: #10b981;
  --gt-bar: #10b981;
}
```

```vue
<div class="my-gantt-theme">
  <GanttChart :data="tasks" />
</div>
```

### 暗色模式

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
