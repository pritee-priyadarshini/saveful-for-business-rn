type Listener = (...args: any[]) => void;

/**
 * Minimal event emitter for React Native.
 * Node's built-in `events` module is not available in the RN runtime.
 */
export default class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();

  addListener(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) return false;

    for (const listener of [...eventListeners]) {
      listener(...args);
    }
    return true;
  }
}
