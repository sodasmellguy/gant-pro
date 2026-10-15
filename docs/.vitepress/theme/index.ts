import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { enhanceApp } from './enhanceApp'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp,
} satisfies Theme
