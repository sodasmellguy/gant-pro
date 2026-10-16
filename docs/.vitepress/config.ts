import { defineConfig } from 'vitepress'

export default defineConfig({
  // GitHub Pages 部署在子路径 https://<user>.github.io/gant-pro/
  // 如使用自定义域名（根路径），删除此行或改为 '/'
  base: '/gant-pro/',
  title: 'gantt-pro',
  description: '跨框架甘特图组件库 — Vue 3 + React',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  // 站点地图，帮助搜索引擎索引
  sitemap: {
    hostname: 'https://sodasmellguy.github.io/gant-pro/',
  },

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '指南', link: '/guide/intro' },
      { text: '功能', link: '/features/data-model' },
      { text: 'Demo', link: '/demo' },
      { text: 'API', link: '/api/props' },
      { text: 'FAQ', link: '/faq/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '项目介绍', link: '/guide/intro' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装引入', link: '/guide/installation' },
            { text: '从其他库迁移', link: '/guide/migration' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '插槽与自定义渲染', link: '/guide/slots' },
            { text: '核心引擎 (GanttEngine)', link: '/guide/engine' },
            { text: '工具函数', link: '/guide/utils' },
            { text: '最佳实践', link: '/guide/best-practices' },
          ],
        },
      ],
      '/features/': [
        {
          text: '基础功能',
          items: [
            { text: '数据模型', link: '/features/data-model' },
            { text: '时间刻度与缩放', link: '/features/scale' },
            { text: '任务条交互', link: '/features/interaction' },
            { text: '表格与列', link: '/features/table' },
          ],
        },
        {
          text: '高级功能',
          items: [
            { text: '依赖连线', link: '/features/dependencies' },
            { text: '关键路径', link: '/features/critical-path' },
            { text: '基准线对比', link: '/features/baseline' },
            { text: '撤销与重做', link: '/features/undo-redo' },
            { text: '工作日历', link: '/features/work-calendar' },
            { text: '多图联动', link: '/features/sync' },
            { text: '导出', link: '/features/export' },
            { text: '虚拟滚动', link: '/features/virtual-scroll' },
            { text: '资源面板', link: '/features/resource' },
          ],
        },
        {
          text: '视觉与主题',
          items: [
            { text: '主题与暗色模式', link: '/features/theme' },
            { text: '国际化', link: '/features/i18n' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'Props', link: '/api/props' },
            { text: 'Events', link: '/api/events' },
            { text: 'Methods', link: '/api/methods' },
            { text: '类型定义', link: '/api/types' },
            { text: 'CSS 变量', link: '/api/css-vars' },
          ],
        },
      ],
      '/faq/': [
        {
          text: '常见问题',
          items: [
            { text: 'FAQ', link: '/faq/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/sodasmellguy/gant-pro' },
    ],

    // 编辑链接 — 指向 GitHub 仓库源文件
    editLink: {
      pattern: 'https://github.com/sodasmellguy/gant-pro/edit/master/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    lastUpdatedText: '最后更新',

    search: {
      provider: 'local',
    },
  },
})
