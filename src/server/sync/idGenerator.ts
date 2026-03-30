/*
 * Generator for unique alphanumeric identifiers
 *
 * @module idGenerator
 */

const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

const pattern = (length: number): RegExp => new RegExp(`^[${chars}]{${String(length)}}$`)

const acceptAllFilter = (): boolean => true

/*
 * Generates a unique alphanumeric identifier
 *
 * @param {Function} filter a function that returns false for existent ids and
 *   true for unique ones.
 * @param {Number} length the number of characters in the id
 * @return {String} id
 *
 * @memberOf idGenerator
 */
export function generate(
  filter?: (id: string) => boolean,
  length?: number
): string | null {
  const filterFn = filter ?? acceptAllFilter
  const idLength = length ?? 8

  const generateId = (): string => {
    let id = ""
    for (let i = 0; i < idLength; i++) {
      const index = Math.floor(Math.random() * chars.length)
      id += chars[index]
    }
    return id
  }

  const maxNumberOfTries = Math.pow(chars.length, idLength)

  for (let i = 0; i <= maxNumberOfTries; i++) {
    const id = generateId()
    if (filterFn(id)) {
      return id
    }
  }

  return null // no id could be found that was accepted by the filter
}

/*
 * Checks an identifier for syntactical correctness
 *
 * @param {String} id the identifier
 * @param {Number} length the required length of the identifier
 * @return {Boolean} true/false depending on the correctness of the identifier
 *
 * @memberOf idGenerator
 */
export function check(id: string, length?: number): boolean {
  const idLength = length ?? 8
  return pattern(idLength).test(id)
}
