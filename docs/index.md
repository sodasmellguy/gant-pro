---
layout: home

hero:
  name: gantt-pro
  text: 跨框架甘特图组件
  tagline: 零第三方依赖 · Vue 3 + React · 企业级功能 · 开箱即用
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 在线 Demo
      link: /demo
    - theme: alt
      text: 项目介绍
      link: /guide/intro
    - theme: alt
      text: API 参考
      link: /api/props

features:
  - icon: 📦
    title: 零运行时依赖
    details: 不依赖 dayjs / lodash / sortablejs / 任何 UI 框架。所有日期运算、拖拽排序、状态管理全部自实现，打包体积极小，加载速度快。
  - icon: 🔄
    title: 跨框架架构
    details: 核心逻辑完全框架无关（@gantt-pro/core），同时提供 Vue 3 和 React 18+ 适配层，API 对齐，切换框架无需重写业务代码。
  - icon: 🎯
    title: 关键路径分析 (CPM)
    details: 内置 CPM 算法，自动计算项目关键路径。浮时为零的任务和依赖连线高亮标红，一眼识别哪些任务不能延期。
  - icon: 🔗
    title: 依赖顺推
    details: 支持 FS/SS/FF/SF 四种依赖类型，拖拽改变任务时间后自动顺推后续任务，内置环检测防止死循环。
  - icon: ↩️
    title: 撤销 / 重做
    details: 完整的 undo/redo 历史栈，所有拖拽移动、端点缩放、进度调整、行内编辑、行排序操作均可一键回退。
  - icon: 📊
    title: 双向虚拟滚动
    details: 行 + 列双向虚拟化渲染，1000+ 任务和大量时间列依然 60fps 流畅滚动，DOM 节点数恒定。
  - icon: 🎨
    title: 主题系统
    details: 4 种主题预设 + 暗色模式 + 自定义主色 + 层级行背景色 + 条形动效（shimmer/pulse/flow），全部通过 CSS 变量驱动。
  - icon: 📤
    title: 导出能力
    details: 一键导出 PNG 高清图片 / CSV 数据 / JSON 格式，PNG 采用 2x 分辨率渲染，CSS 变量自动内联。
  - icon: 📅
    title: 工作日历
    details: 自定义工作日/休息日/调休补班，计算有效工期时自动排除非工作日，完美适配国内节假日场景。
  - icon: 🔗
    title: 多图联动
    details: GanttSyncHub 可同步多个甘特图实例的滚动、缩放、选择和展开状态，适合多项目对比展示。
  - icon: 🌍
    title: 国际化
    details: 内置中英文，支持完全自定义标签，可扩展任意语言。刻度标签、右键菜单、搜索提示均可覆盖。
  - icon: ⚡
    title: 丰富交互
    details: 拖拽移动 / 端点缩放 / 进度拖拽 / 行排序 / 行内编辑 / 右键菜单 / 吸附对齐 / 视口外定位指示器 / Ctrl+滚轮缩放 / 触摸双指缩放。
---

### 适用场景

- **项目管理工具** — 任务编排、依赖管理、进度跟踪
- **生产排程系统** — 工序排程、资源分配、产能规划
- **研发管理平台** — 迭代规划、里程碑管理、关键路径分析
- **施工进度管理** — 工期排布、基准对比、延期预警
