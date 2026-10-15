/**
 * 响应式原语：Signal / Computed / batch / effect
 *
 * 框架无关的极简响应式系统，不依赖 Vue / React / Solid 运行时。
 *
 * 核心设计：
 * - Signal: 可变值，set 时通知所有订阅者
 * - Computed: 惰性派生值，首次读取时建立与 Signal 的依赖关系
 *   依赖变更时标记 dirty 并通知自身订阅者
 * - effect: 自动追踪依赖的副作用
 * - batch: 批量更新，延迟通知
 */

// ==================== 全局上下文 ====================

/** 当前正在追踪依赖的 Computed/effect（栈结构支持嵌套） */
const depStack: (() => void)[] = []

/** 获取当前 observer */
function currentObserver(): (() => void) | null {
  return depStack.length > 0 ? depStack[depStack.length - 1] : null
}

// ==================== Signal ====================

export class Signal<T> {
  private _value: T
  private _subs = new Set<() => void>()

  constructor(initial: T) {
    this._value = initial
  }

  get value(): T {
    // 自动注册当前 observer 为订阅者
    const obs = currentObserver()
    if (obs) {
      this._subs.add(obs)
    }
    return this._value
  }

  set value(v: T) {
    if (Object.is(v, this._value)) return
    this._value = v
    this._notify()
  }

  subscribe(fn: () => void): () => void {
    this._subs.add(fn)
    return () => this._subs.delete(fn)
  }

  peek(): T {
    return this._value
  }

  update(fn: (prev: T) => T): void {
    this.value = fn(this._value)
  }

  private _notify(): void {
    const subs = [...this._subs]
    if (batchDepth > 0) {
      for (const fn of subs) batchQueue.add(fn)  // Set 去重
    } else {
      for (const fn of subs) fn()
    }
  }
}

// ==================== Computed ====================

export class Computed<T> {
  private _value: T
  private _dirty = true
  private _subs = new Set<() => void>()
  private _compute: () => T
  /** 依赖的 Signal 上注册的 markDirty 回调 */
  private _depSignals = new Set<{ _subs: Set<() => void> } & { _notify?: () => void }>()
  /** markDirty 回调本身（用于从旧依赖中注销） */
  private _depUnsubs: (() => void)[] = []
  private _markDirtyFn: () => void

  constructor(compute: () => T) {
    this._compute = compute
    this._value = undefined as T
    this._dirty = true
    this._markDirtyFn = () => this.markDirty()
  }

  get value(): T {
    if (this._dirty) {
      // 清除旧依赖
      for (const unsub of this._depUnsubs) unsub()
      this._depUnsubs = []

      // 将 markDirtyFn 压栈，执行 compute 时 Signal 会自动注册它
      depStack.push(this._markDirtyFn)
      try {
        this._value = this._compute()
      } finally {
        depStack.pop()
      }
      this._dirty = false
    }
    // 自动注册当前 observer 为本 Computed 的订阅者
    const obs = currentObserver()
    if (obs) {
      this._subs.add(obs)
    }
    return this._value
  }

  markDirty(): void {
    if (this._dirty) return
    this._dirty = true
    // 通知所有订阅者（下游 Computed / effect）
    for (const fn of [...this._subs]) {
      fn()
    }
  }

  subscribe(fn: () => void): () => void {
    this._subs.add(fn)
    // 首次订阅时，确保值已计算（建立依赖链）
    void this.value
    return () => this._subs.delete(fn)
  }
}

// ==================== batch ====================

let batchDepth = 0
let batchQueue: Set<() => void> = new Set()

export function batch(fn: () => void): void {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      const q = batchQueue
      batchQueue = new Set()
      for (const notify of q) notify()
    }
  }
}

// ==================== effect ====================

export function effect(fn: () => void): () => void {
  let disposed = false
  const run = () => {
    if (disposed) return
    depStack.push(run)
    try {
      fn()
    } finally {
      depStack.pop()
    }
  }
  run()
  return () => { disposed = true }
}

// ==================== 便捷函数 ====================

export function signal<T>(initial: T): Signal<T> {
  return new Signal(initial)
}

export function computed<T>(compute: () => T): Computed<T> {
  return new Computed(compute)
}

export function trackDeps(fn: () => void): void {
  depStack.push(fn)
  try {
    fn()
  } finally {
    depStack.pop()
  }
}
