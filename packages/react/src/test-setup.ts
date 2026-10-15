import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any

// Polyfill matchMedia
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}
