/**
 * Type utility functions to help with TypeScript strict mode compliance
 */

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Type guard to check if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * Safely convert unknown error to Error object
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string') {
    return new Error(error)
  }
  return new Error(String(error))
}

/**
 * Safely get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return String(error)
}

/**
 * Assert that a value is non-null (throws if null/undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined')
  }
}

/**
 * Non-null assertion with fallback
 */
export function nonNull<T>(value: T | null | undefined, fallback: T): T {
  return value ?? fallback
}

/**
 * Safely access a property that might not exist
 */
export function safeGet<T, K extends string>(
  obj: T,
  key: K
): K extends keyof T ? T[K] : unknown {
  type ReturnType = K extends keyof T ? T[K] : unknown
  if (isObject(obj) && key in obj) {
    return obj[key] as ReturnType
  }
  return undefined as ReturnType
}

/**
 * Type-safe number conversion
 */
export function toNumber(value: unknown, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  const num = Number(value)
  return isNaN(num) ? fallback : num
}

/**
 * Type-safe string conversion
 */
export function toString(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'object' || typeof value === 'function') {
    return fallback
  }
  return String(value as string | number | boolean | symbol | bigint)
}

/**
 * Safely execute a promise and ignore errors (for fire-and-forget)
 */
export function ignorePromise(promise: Promise<unknown>): void {
  void promise.catch(() => {
    // Intentionally ignore errors for fire-and-forget promises
  })
}
