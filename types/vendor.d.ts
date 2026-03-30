interface Bootbox {
  dialog(options: BootboxDialogOptions): JQuery;
  alert(message: string, callback?: () => void): JQuery;
  alert(options: BootboxAlertOptions): JQuery;
  confirm(message: string, callback: (result: boolean) => void): JQuery;
  confirm(options: BootboxConfirmOptions): JQuery;
  prompt(message: string, callback: (result: string | null) => void): JQuery;
  prompt(options: BootboxPromptOptions): JQuery;
  hideAll(): void;
}

interface BootboxDialogOptions {
  title?: string;
  message: string | JQuery;
  onEscape?: boolean | (() => void);
  show?: boolean;
  backdrop?: boolean;
  closeButton?: boolean;
  animate?: boolean;
  className?: string;
  size?: 'small' | 'large';
  buttons?: Record<string, BootboxButton>;
}

interface BootboxAlertOptions {
  message: string;
  callback?: () => void;
  title?: string;
  size?: 'small' | 'large';
}

interface BootboxConfirmOptions {
  message: string;
  callback: (result: boolean) => void;
  title?: string;
  size?: 'small' | 'large';
}

interface BootboxPromptOptions {
  message?: string;
  title: string;
  callback: (result: string | null) => void;
  value?: string;
  inputType?: 'text' | 'textarea' | 'email' | 'select' | 'checkbox' | 'date' | 'time' | 'number' | 'password';
  inputOptions?: Array<{ text: string; value: string }>;
}

interface BootboxButton {
  label: string;
  className?: string;
  callback?: () => boolean | void;
}

declare module 'bootbox' {
  const bootbox: Bootbox;
  export = bootbox;
}

declare module 'nanobar' {
  interface NanobarOptions {
    target?: HTMLElement;
    id?: string;
    classname?: string;
  }

  export default class Nanobar {
    constructor(options?: NanobarOptions);
    go(percentage: number): void;
  }
}

declare module 'mousetrap' {
  type Callback = (e: KeyboardEvent, combo: string) => boolean | void;

  function bind(keys: string | string[], callback: Callback, action?: string): void;
  function unbind(keys: string | string[], action?: string): void;
  function trigger(keys: string, action?: string): void;
  function reset(): void;
  function stopCallback(e: KeyboardEvent, element: HTMLElement, combo: string): boolean;

  export { bind, unbind, trigger, reset, stopCallback };
}

declare module 'zeroclipboard' {
  interface ZeroClipboardConfig {
    swfPath?: string;
    trustedDomains?: string[];
    cacheBust?: boolean;
    forceEnhancedClipboard?: boolean;
    flashLoadTimeout?: number;
    autoActivate?: boolean;
    bubbleEvents?: boolean;
    containerId?: string;
    containerClass?: string;
    hoverClass?: string;
    activeClass?: string;
    title?: string;
    zIndex?: number;
  }

  interface ZeroClipboardClient {
    on(eventName: string, callback: (event: ZeroClipboardEvent) => void): ZeroClipboardClient;
    off(eventName?: string, callback?: (event: ZeroClipboardEvent) => void): ZeroClipboardClient;
    clip(elements: HTMLElement | HTMLElement[] | NodeList | JQuery): ZeroClipboardClient;
    unclip(elements?: HTMLElement | HTMLElement[] | NodeList | JQuery): ZeroClipboardClient;
    setText(text: string): ZeroClipboardClient;
    setHtml(html: string): ZeroClipboardClient;
    setRichText(richText: string): ZeroClipboardClient;
    setData(format: string, data: string): ZeroClipboardClient;
    clearData(format?: string): ZeroClipboardClient;
    getData(format: string): string | undefined;
    destroy(): void;
  }

  interface ZeroClipboardEvent {
    client: ZeroClipboardClient;
    type: string;
    target: HTMLElement;
    relatedTarget: HTMLElement;
    currentTarget: HTMLElement;
    timeStamp: number;
  }

  function config(options: ZeroClipboardConfig): typeof ZeroClipboard;
  function create(): ZeroClipboardClient;
  function destroy(): void;
  function setData(format: string, data: string): void;
  function clearData(format?: string): void;
  function getData(format: string): string | undefined;
  function focus(element: HTMLElement): void;
  function blur(): void;
  function activeElement(): HTMLElement | null;
  function state(): Record<string, unknown>;
  function isFlashUnusable(): boolean;
  function on(eventName: string, callback: (event: ZeroClipboardEvent) => void): typeof ZeroClipboard;
  function off(eventName?: string, callback?: (event: ZeroClipboardEvent) => void): typeof ZeroClipboard;
  function emit(event: string | ZeroClipboardEvent): void;
  function handlers(eventName: string): Array<(event: ZeroClipboardEvent) => void>;

  export default class ZeroClipboard implements ZeroClipboardClient {
    constructor(elements?: HTMLElement | HTMLElement[] | NodeList | JQuery);
    on(eventName: string, callback: (event: ZeroClipboardEvent) => void): this;
    off(eventName?: string, callback?: (event: ZeroClipboardEvent) => void): this;
    clip(elements: HTMLElement | HTMLElement[] | NodeList | JQuery): this;
    unclip(elements?: HTMLElement | HTMLElement[] | NodeList | JQuery): this;
    setText(text: string): this;
    setHtml(html: string): this;
    setRichText(richText: string): this;
    setData(format: string, data: string): this;
    clearData(format?: string): this;
    getData(format: string): string | undefined;
    destroy(): void;

    static config: typeof config;
    static create: typeof create;
    static destroy: typeof destroy;
    static setData: typeof setData;
    static clearData: typeof clearData;
    static getData: typeof getData;
    static focus: typeof focus;
    static blur: typeof blur;
    static activeElement: typeof activeElement;
    static state: typeof state;
    static isFlashUnusable: typeof isFlashUnusable;
    static on: typeof on;
    static off: typeof off;
    static emit: typeof emit;
    static handlers: typeof handlers;
  }

  export { config, create };
}

declare module 'stl-exporter' {
  interface FaceVertexMesh {
    name?: string;
    vertices: number[];
    faces: number[];
  }

  export function toBinaryStl(meshes: FaceVertexMesh[], name?: string): ArrayBuffer;
  export function toAsciiStl(meshes: FaceVertexMesh[], name?: string): string;
}

declare module 'stl-parser' {
  import { EventEmitter } from 'events';

  interface ParsedStl {
    vertices: Float32Array;
    normals: Float32Array;
  }

  interface StlFace {
    normal: [number, number, number];
    vertices: [[number, number, number], [number, number, number], [number, number, number]];
  }

  interface StlModel {
    faces: StlFace[];
    name?: string;
  }

  interface StlParserOptions {
    type?: 'binary' | 'ascii';
  }

  interface StlParserStream extends EventEmitter {
    on(event: 'data', listener: (data: StlModel) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'end', listener: () => void): this;
    resume(): void;
  }

  function stlParser(buffer: Buffer, options?: StlParserOptions): StlParserStream;
  export default stlParser;
  export function parse(buffer: ArrayBuffer): ParsedStl;
}

declare module 'meshlib' {
  export interface Mesh {
    positions: Float32Array;
    cells: Uint32Array;
  }

  export interface MeshlibModel {
    model: {
      name?: string;
      fileName?: string;
    };
    setFileName(name: string): MeshlibModel;
    setName(name: string): MeshlibModel;
    calculateNormals(): MeshlibModel;
    buildFaceVertexMesh(): MeshlibModel;
    buildFacesFromFaceVertexMesh(): MeshlibModel;
    done(): Promise<void>;
    getBase64(): Promise<string>;
    getAutoAlignMatrix(): Promise<number[][] | undefined>;
  }

  interface ModelStatic {
    fromObject(obj: { mesh: unknown }): MeshlibModel;
    fromBase64(base64: string): MeshlibModel;
  }

  interface Meshlib {
    Model: ModelStatic;
  }

  const meshlib: Meshlib;
  export default meshlib;
  export function optimize(mesh: Mesh): Mesh;
}

declare module 'bootstrap-styl' {
  function bootstrap(): void;
  export default bootstrap;
}

declare module 'nib' {
  function nib(): unknown;
  export default nib;
}

declare module 'perfect-scrollbar' {
  interface PerfectScrollbarOptions {
    handlers?: string[];
    maxScrollbarLength?: number | null;
    minScrollbarLength?: number | null;
    scrollingThreshold?: number;
    scrollXMarginOffset?: number;
    scrollYMarginOffset?: number;
    suppressScrollX?: boolean;
    suppressScrollY?: boolean;
    swipeEasing?: boolean;
    useBothWheelAxes?: boolean;
    wheelPropagation?: boolean;
    wheelSpeed?: number;
  }

  export default class PerfectScrollbar {
    constructor(element: HTMLElement | string, options?: PerfectScrollbarOptions);
    update(): void;
    destroy(): void;
  }
}

declare module 'PEP' {
  // Pointer Events Polyfill - auto-initializes
}

declare module 'blueimp-md5' {
  function md5(value: string, key?: string, raw?: boolean): string;
  export default md5;
}

declare module 'node-png' {
  import { Buffer } from 'buffer';

  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: PNGOptions);
    pack(): this;
    on(event: 'data', listener: (chunk: Buffer) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  }

  interface PNGOptions {
    width?: number;
    height?: number;
    fill?: boolean;
    checkCRC?: boolean;
    deflateChunkSize?: number;
    deflateLevel?: number;
    deflateStrategy?: number;
    deflateFactory?: unknown;
    filterType?: number | number[];
    colorType?: number;
    inputColorType?: number;
    bitDepth?: number;
    inputHasAlpha?: boolean;
    bgColor?: { red: number; green: number; blue: number };
  }

  export default PNG;
}

declare module 'fs-promise' {
  import * as fs from 'fs';

  export function readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  export function readFile(path: string): Promise<Buffer>;
  export function writeFile(path: string, data: string | Buffer): Promise<void>;
  export function mkdir(path: string, options?: fs.MakeDirectoryOptions): Promise<void>;
  export function readdir(path: string): Promise<string[]>;
  export function stat(path: string): Promise<fs.Stats>;
  export function exists(path: string): Promise<boolean>;
  export function unlink(path: string): Promise<void>;
  export function rmdir(path: string): Promise<void>;
}

declare module 'readdirp' {
  import { Readable } from 'stream';

  interface ReaddirpOptions {
    root?: string;
    fileFilter?: string | string[] | ((entry: EntryInfo) => boolean);
    directoryFilter?: string | string[] | ((entry: EntryInfo) => boolean);
    depth?: number;
    entryType?: 'files' | 'directories' | 'both' | 'all';
    lstat?: boolean;
    alwaysStat?: boolean;
  }

  interface EntryInfo {
    path: string;
    fullPath: string;
    name: string;
    basename: string;
    stat?: import('fs').Stats;
    dirent?: import('fs').Dirent;
  }

  function readdirp(root: string, options?: ReaddirpOptions): Readable;

  export = readdirp;
}

declare module 'es6-collections' {
  // Polyfill for Map, Set, WeakMap, WeakSet
}

declare module 'es6-collections-iterators' {
  // Polyfill for iterators
}

declare module 'path-browserify' {
  interface Path {
    resolve(...paths: string[]): string;
    normalize(p: string): string;
    isAbsolute(p: string): boolean;
    join(...paths: string[]): string;
    relative(from: string, to: string): string;
    dirname(p: string): string;
    basename(p: string, ext?: string): string;
    extname(p: string): string;
    parse(p: string): { root: string; dir: string; base: string; ext: string; name: string };
    format(pathObject: { root?: string; dir?: string; base?: string; ext?: string; name?: string }): string;
    sep: string;
    delimiter: string;
  }
  const path: Path;
  export default path;
}

declare module 'bootstrap/dist/js/bootstrap.js' {
  // Bootstrap JavaScript module
}

declare module 'jszip' {
  interface JSZipObject {
    name: string;
    dir: boolean;
    date: Date;
    comment: string;
    async(type: 'string'): Promise<string>;
    async(type: 'blob'): Promise<Blob>;
    async(type: 'arraybuffer'): Promise<ArrayBuffer>;
    async(type: 'uint8array'): Promise<Uint8Array>;
    async(type: 'nodebuffer'): Promise<Buffer>;
  }

  interface JSZip {
    file(name: string): JSZipObject | null;
    file(regex: RegExp): JSZipObject[];
    file(name: string, data: string | ArrayBuffer | Uint8Array | Blob | Promise<unknown>, options?: { binary?: boolean; base64?: boolean; date?: Date; compression?: string; comment?: string }): this;
    folder(name: string): JSZip | null;
    folder(regex: RegExp): JSZipObject[];
    forEach(callback: (relativePath: string, file: JSZipObject) => void): void;
    remove(name: string): this;
    // Legacy sync generate method (used in older JSZip versions)
    generate(options: { type: 'blob' }): Blob;
    generate(options: { type: 'arraybuffer' }): ArrayBuffer;
    generate(options: { type: 'uint8array' }): Uint8Array;
    generate(options: { type: 'string' }): string;
    generate(options: { type: 'base64' }): string;
    generateAsync(options: { type: 'blob'; compression?: string; compressionOptions?: { level: number } }): Promise<Blob>;
    generateAsync(options: { type: 'arraybuffer'; compression?: string; compressionOptions?: { level: number } }): Promise<ArrayBuffer>;
    generateAsync(options: { type: 'uint8array'; compression?: string; compressionOptions?: { level: number } }): Promise<Uint8Array>;
    generateAsync(options: { type: 'nodebuffer'; compression?: string; compressionOptions?: { level: number } }): Promise<Buffer>;
    generateAsync(options: { type: 'string'; compression?: string; compressionOptions?: { level: number } }): Promise<string>;
    generateAsync(options: { type: 'base64'; compression?: string; compressionOptions?: { level: number } }): Promise<string>;
    loadAsync(data: ArrayBuffer | Uint8Array | string | Blob, options?: { optimizedBinaryString?: boolean; base64?: boolean; checkCRC32?: boolean; createFolders?: boolean }): Promise<JSZip>;
  }

  interface JSZipConstructor {
    new (): JSZip;
    loadAsync(data: ArrayBuffer | Uint8Array | string | Blob, options?: { optimizedBinaryString?: boolean; base64?: boolean; checkCRC32?: boolean; createFolders?: boolean }): Promise<JSZip>;
  }

  const JSZip: JSZipConstructor;
  export default JSZip;
}

declare module 'stylus' {
  interface StylusRenderer {
    set(key: string, value: unknown): StylusRenderer;
    use(plugin: unknown): StylusRenderer;
    define(name: string, value: unknown): StylusRenderer;
    render(callback?: (err: Error | null, css: string) => void): string;
  }

  interface StylusMiddlewareOptions {
    src: string;
    dest?: string;
    compile?(str: string, path: string): StylusRenderer;
  }

  interface Stylus {
    (str: string): StylusRenderer;
    middleware(options: StylusMiddlewareOptions): unknown;
  }

  const stylus: Stylus;
  export default stylus;
}
