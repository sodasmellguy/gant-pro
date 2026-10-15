/**
 * React Context — 替代 Vue 的 provide/inject
 */
import { createContext, useContext } from 'react'
import type { GanttEngine } from '@gantt-pro/core'

export const GanttContext = createContext<GanttEngine | null>(null)

export function useGanttEngine(): GanttEngine {
  const engine = useContext(GanttContext)
  if (!engine) {
    throw new Error('useGanttEngine must be used within <GanttChart>')
  }
  return engine
}
