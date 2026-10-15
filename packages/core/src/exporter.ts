/**
 * 导出工具：PNG 图片 / CSV 数据 / JSON
 */
import type { GanttTask, ExportOptions } from './types'

/** 扁平化任务树（含子任务） */
export function flattenTasks(tasks: GanttTask[], includeChildren = true): GanttTask[] {
  const result: GanttTask[] = []
  const walk = (list: GanttTask[]) => {
    for (const t of list) {
      result.push(t)
      if (includeChildren && t.children?.length) walk(t.children)
    }
  }
  walk(tasks)
  return result
}

/** 导出 CSV */
export function exportCSV(tasks: GanttTask[], options: ExportOptions = { format: 'csv' }): string {
  const delimiter = options.delimiter ?? ','
  const flat = flattenTasks(tasks, options.includeChildren ?? true)
  const headers = ['ID', '名称', '开始日期', '结束日期', '进度', '负责人', '里程碑']
  const rows = flat.map(t => [
    t.id,
    `"${(t.name ?? '').replace(/"/g, '""')}"`,
    t.startDate ? String(t.startDate).split('T')[0] : '',
    t.endDate ? String(t.endDate).split('T')[0] : '',
    String(t.progress ?? 0),
    typeof t.owner === 'string' ? t.owner : (t.owner?.name ?? ''),
    t.milestone ? '是' : '否'
  ])
  return [headers.join(delimiter), ...rows.map(r => r.join(delimiter))].join('\n')
}

/** 导出 JSON */
export function exportJSON(tasks: GanttTask[]): string {
  return JSON.stringify(tasks, null, 2)
}

/**
 * 将 DOM 元素的 CSS 变量内联为具体值（解决 SVG foreignObject 中 CSS 变量不生效问题）
 * 递归遍历元素及子元素，读取 computed style 中的 var() 值并内联
 */
function inlineCssVars(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement
  const rootStyle = getComputedStyle(element)

  // 动态收集所有 --gt-* 和 --gantt-* CSS 变量（不限于硬编码列表）
  const vars: Record<string, string> = {}
  // 遍历 :root 的样式规则收集变量
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (rule instanceof CSSStyleRule) {
            const style = rule.style
            for (let i = 0; i < style.length; i++) {
              const prop = style[i]
              if (prop && prop.startsWith('--')) {
                const val = style.getPropertyValue(prop).trim()
                if (val) vars[prop] = val
              }
            }
          }
        }
      } catch {
        // cross-origin stylesheet, skip
      }
    }
  } catch {
    // ignore
  }
  // 也从元素自身 computed style 读取
  for (let i = 0; i < rootStyle.length; i++) {
    const prop = rootStyle[i]
    if (prop && prop.startsWith('--')) {
      const val = rootStyle.getPropertyValue(prop).trim()
      if (val) vars[prop] = val
    }
  }
  // 在克隆的根元素上内联 CSS 变量
  for (const [k, v] of Object.entries(vars)) {
    clone.style.setProperty(k, v)
  }

  // 递归内联子元素的关键 computed style
  const walk = (src: HTMLElement, dst: HTMLElement) => {
    const srcStyle = getComputedStyle(src)
    // 内联 background、color、border 等关键属性（扩展列表提升还原度）
    const props = [
      'background', 'background-color', 'color', 'border-color', 'border-width',
      'border-style', 'border-radius', 'font-family', 'font-size', 'font-weight',
      'opacity', 'box-shadow', 'text-align', 'padding', 'margin',
      'display', 'position', 'left', 'top', 'right', 'bottom', 'width', 'height',
      'flex', 'justify-content', 'align-items', 'overflow', 'z-index', 'cursor'
    ]
    for (const p of props) {
      const val = srcStyle.getPropertyValue(p)
      if (val && val !== '' && !val.includes('var(')) {
        dst.style.setProperty(p, val)
      }
    }
    // 递归子元素
    const srcChildren = src.children
    const dstChildren = dst.children
    for (let i = 0; i < srcChildren.length && i < dstChildren.length; i++) {
      if (srcChildren[i] instanceof HTMLElement && dstChildren[i] instanceof HTMLElement) {
        walk(srcChildren[i] as HTMLElement, dstChildren[i] as HTMLElement)
      }
    }
  }
  walk(element, clone)
  return clone
}

/** 安全转义 HTML 属性值 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 收集元素内所有样式表文本，内联到 SVG 中 */
function collectStylesheets(): string {
  let cssText = ''
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          cssText += rule.cssText + '\n'
        }
      } catch {
        // cross-origin, skip
      }
    }
  } catch {
    // ignore
  }
  return cssText
}

/** 导出 PNG（从 DOM 元素截图，增强可靠性方案） */
export async function exportPNG(element: HTMLElement, options: ExportOptions = { format: 'png' }): Promise<Blob> {
  const rect = element.getBoundingClientRect()
  const width = Math.max(rect.width, 100)
  const height = Math.max(rect.height, 100)
  const scale = options.scale ?? 2
  const background = options.background ?? '#ffffff'

  // 方案：内联 CSS 变量 + 收集样式表 → 序列化为 SVG foreignObject
  const clone = inlineCssVars(element)
  const serializer = new XMLSerializer()
  const htmlStr = serializer.serializeToString(clone)
  const cssText = collectStylesheets()

  // 构建包含必要样式的 SVG
  const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background:${escapeHtml(background)}">
    <defs>
      <style type="text/css"><![CDATA[ ${cssText} ]]></style>
    </defs>
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;">
        ${htmlStr}
      </div>
    </foreignObject>
  </svg>`

  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    // 超时保护（10 秒）
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(svgUrl)
      reject(new Error('PNG export timed out (image load exceeded 10s). The element may be too large or contain unsupported content.'))
    }, 10000)
    img.onload = () => {
      clearTimeout(timeoutId)
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.scale(scale, scale)
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
      try {
        ctx.drawImage(img, 0, 0)
      } catch (e) {
        URL.revokeObjectURL(svgUrl)
        reject(new Error('Failed to draw image to canvas. ' + (e as Error).message))
        return
      }
      URL.revokeObjectURL(svgUrl)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob from canvas'))
      }, 'image/png')
    }
    img.onerror = () => {
      clearTimeout(timeoutId)
      URL.revokeObjectURL(svgUrl)
      // 提供详细的错误提示
      reject(new Error(
        'Failed to render SVG to image. Common causes:\n' +
        '1. Element contains cross-origin images (use data: URIs)\n' +
        '2. CSS variables not fully inlined\n' +
        '3. SVG namespace issues in cloned DOM\n' +
        '4. Element is too large for canvas limits'
      ))
    }
    img.src = svgUrl
  })
}

/** 下载文件 */
export function downloadFile(content: string | Blob, filename: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 统一导出入口 */
export async function exportGantt(
  tasks: GanttTask[],
  element: HTMLElement | null,
  options: ExportOptions
): Promise<void> {
  switch (options.format) {
    case 'csv':
      downloadFile(exportCSV(tasks, options), 'gantt-data.csv')
      break
    case 'json':
      downloadFile(exportJSON(tasks), 'gantt-data.json')
      break
    case 'png':
      if (!element) throw new Error('PNG export requires a DOM element')
      const blob = await exportPNG(element, options)
      downloadFile(blob, 'gantt-chart.png')
      break
  }
}
