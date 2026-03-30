// Returns whether or not at least one element of the input
// array in not null/undefined
export function anyDefinedInArray (array: unknown[]): boolean {
  return array.some(entry => entry != null)
}

// Returns the union of all sets in the argument
// input sets remain intact
export function union<T> (arrayOfSets: Set<T>[]): Set<T> {
  const result = new Set<T>()
  for (const set of Array.from(arrayOfSets)) {
    set.forEach(element => result.add(element))
  }
  return result
}

// Returns the intersect of two sets
export function intersection<T> (set1: Set<T>, set2: Set<T>): Set<T> {
  const result = new Set<T>()
  set1.forEach((element) => {
    if (set2.has(element)) {
      result.add(element)
    }
  })
  return result
}

// Returns set1 \ set2
export function difference<T> (set1: Set<T>, set2: Set<T>): Set<T> {
  const result = new Set<T>()
  set1.forEach((element) => {
    if (!set2.has(element)) {
      result.add(element)
    }
  })
  return result
}

export function smallestElement<T> (set: Set<T>): T | null {
  let min: T | null = null
  set.forEach((element) => {
    if (min == null) {
      min = element
    }
    if (element < min) {
      min = element
    }
  })
  return min
}
