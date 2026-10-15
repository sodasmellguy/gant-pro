import { describe, it, expect, vi } from 'vitest'
import { Signal, Computed, batch, effect, signal, computed } from './reactive'

describe('Signal', () => {
  it('should hold initial value', () => {
    const s = new Signal(42)
    expect(s.value).toBe(42)
  })

  it('should update value', () => {
    const s = new Signal(0)
    s.value = 10
    expect(s.value).toBe(10)
  })

  it('should not notify on same value', () => {
    const s = new Signal(5)
    const fn = vi.fn()
    s.subscribe(fn)
    s.value = 5 // same value
    expect(fn).not.toHaveBeenCalled()
  })

  it('should notify subscribers on change', () => {
    const s = new Signal(0)
    const fn = vi.fn()
    s.subscribe(fn)
    s.value = 1
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should return unsubscribe function', () => {
    const s = new Signal(0)
    const fn = vi.fn()
    const unsub = s.subscribe(fn)
    s.value = 1
    expect(fn).toHaveBeenCalledTimes(1)
    unsub()
    s.value = 2
    expect(fn).toHaveBeenCalledTimes(1) // not called again
  })

  it('peek should not track deps', () => {
    const s = new Signal(10)
    expect(s.peek()).toBe(10)
  })

  it('update should use functional update', () => {
    const s = new Signal(5)
    s.update(v => v + 3)
    expect(s.value).toBe(8)
  })
})

describe('Computed', () => {
  it('should compute derived value', () => {
    const a = new Signal(2)
    const b = new Signal(3)
    const sum = new Computed(() => a.value + b.value)
    expect(sum.value).toBe(5)
  })

  it('should recompute when dependency changes', () => {
    const a = new Signal(2)
    const doubled = new Computed(() => a.value * 2)
    expect(doubled.value).toBe(4)
    a.value = 5
    expect(doubled.value).toBe(10)
  })

  it('should support nested computed', () => {
    const a = new Signal(1)
    const b = new Computed(() => a.value + 1)
    const c = new Computed(() => b.value * 2)
    expect(c.value).toBe(4)
    a.value = 10
    expect(c.value).toBe(22)
  })

  it('should notify subscribers on change', () => {
    const a = new Signal(1)
    const doubled = new Computed(() => a.value * 2)
    const fn = vi.fn()
    doubled.subscribe(fn)
    a.value = 5
    expect(fn).toHaveBeenCalled()
  })
})

describe('effect', () => {
  it('should auto-track dependencies', () => {
    const a = new Signal(1)
    const fn = vi.fn()
    const stop = effect(() => {
      fn(a.value)
    })
    expect(fn).toHaveBeenCalledWith(1)
    a.value = 5
    expect(fn).toHaveBeenCalledWith(5)
    stop()
    a.value = 10
    expect(fn).not.toHaveBeenCalledWith(10)
  })
})

describe('batch', () => {
  it('should defer notifications until batch ends', () => {
    const a = new Signal(1)
    const b = new Signal(2)
    const fn = vi.fn()
    effect(() => {
      fn(a.value + b.value)
    })
    fn.mockClear()
    batch(() => {
      a.value = 10
      b.value = 20
    })
    // Should only run once after batch
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(30)
  })
})

describe('convenience functions', () => {
  it('signal() creates Signal', () => {
    const s = signal('hello')
    expect(s.value).toBe('hello')
    s.value = 'world'
    expect(s.value).toBe('world')
  })

  it('computed() creates Computed', () => {
    const a = signal(3)
    const c = computed(() => a.value * 3)
    expect(c.value).toBe(9)
  })
})
