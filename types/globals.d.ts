/// <reference path="./vendor.d.ts" />

declare global {
  interface Window {
    jQuery: JQueryStatic;
    $: JQueryStatic;
    bootbox: Bootbox;
    md5: (value: string) => string;
    clone: <T>(obj: T) => T;
    saveAs: (blob: Blob, filename: string) => void;
    Nanobar: any;
    path: typeof import('path-browserify').default;
    ZeroClipboard: any;
    THREE: typeof import('three').default;
  }

  const bootbox: Bootbox;

  const Mousetrap: {
    bind(keys: string | string[], callback: (e: KeyboardEvent, combo: string) => boolean | void, action?: string): void;
    unbind(keys: string | string[], action?: string): void;
    trigger(keys: string, action?: string): void;
    reset(): void;
    stopCallback(e: KeyboardEvent, element: HTMLElement, combo: string): boolean;
  };

  /** Defined by build system - true for static builds without server */
  const IS_STATIC_BUILD: boolean | undefined;
}

export {};
