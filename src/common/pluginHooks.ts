import type { Plugin } from '../types/plugin.js'

type HookCallback = (...args: unknown[]) => unknown;

/*
 * Plugin Hook implementation
 */
export default class PluginHooks {
  private hooks: string[]
  private lists: Record<string, HookCallback[]>;

  // Dynamic hook methods added by initHooks
  [key: string]: unknown;

  constructor() {
    // list of all hooks
    this.hooks = []
    // list of all hooks and their registered callbacks
    this.lists = {}
  }

  // **check if a plugin provides a named hook method**
  hasHook(plugin: Plugin, hook: string): boolean {
    return typeof (plugin as Record<string, unknown>)[hook] === 'function'
  }

  // **call the plugin's hook if provided with the passed arguments**
  call(plugin: Plugin, hook: string, ...args: unknown[]): unknown {
    if (this.hasHook(plugin, hook)) {
      const method = (plugin as Record<string, (...args: unknown[]) => unknown>)[hook]
      return (method as (...args: unknown[]) => unknown)(...args)
    }
    return undefined
  }

  // ***
  // ##Functions for plugin loaders only##

  /*
    **initialize the hook-list.**

    It will create an empty list of callbacks for each hook in `lists` and
    add a function to `module.exports` with the hook's name to be called by the
    modules that uses the hook.

    E.g. if `"foo"` is defined in the list of hooks above, there will be the
    method `module.exports.foo(args...)` with splat arguments that are passed
    to all registered callbacks, that is all plugins that provide a method named
    `foo`.
  */
  initHooks(hookList: string[]): void {
    this.hooks = hookList
    for (const hook of this.hooks) {
      this.lists[hook] = []
    }
    for (const hook of this.hooks) {
      // Create a closure to capture the hook name
      (this as Record<string, unknown>)[hook] = (
        (h: string) =>
        (...args: unknown[]): unknown[] => {
          return (this.lists[h] ?? []).map((callback) => callback(...args))
        }
      )(hook)
    }
  }

  // **register a plugin for all the hooks it provides**
  register(plugin: Plugin): void {
    for (const hook of this.hooks) {
      this.registerHook(plugin, hook)
    }
  }

  // **register a plugin for a specific hook if provided**
  registerHook(plugin: Plugin, hook: string): void {
    const method = (plugin as Record<string, HookCallback | undefined>)[hook]
    if (typeof method === 'function') {
      this.lists[hook].push(method.bind(plugin))
    }
  }

  // **get all callbacks that are registered for a specific hook**
  get(hook: string): HookCallback[] {
    return this.lists[hook]
  }

  // **unregister a plugin for all hooks it was registered for**
  unregister(plugin: Plugin): void {
    for (const hook of this.hooks) {
      this.unregisterHook(plugin, hook)
    }
  }

  // **unregister a plugin for a specific hook if provided and registered**
  unregisterHook(plugin: Plugin, hook: string): void {
    const method = (plugin as Record<string, HookCallback | undefined>)[hook]
    if (typeof method === 'function') {
      const hookList = this.lists[hook]
      const index = hookList.indexOf(method)
      if (index !== -1) {
        hookList.splice(index, 1)
      }
    }
  }
}
