import type { EnhanceAppContext } from 'vitepress'
import GanttDemo from './components/GanttDemo.vue'

export function enhanceApp(ctx: EnhanceAppContext) {
  // 注册全局组件，可在任意 markdown 中使用 <GanttDemo />
  ctx.app.component('GanttDemo', GanttDemo)
}
