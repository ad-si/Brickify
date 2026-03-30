// Shim for the 'text-encoding' npm package.
// Modern browsers ship native TextEncoder/TextDecoder,
// so the heavy polyfill (which crashes under strict-mode bundling) is unnecessary.
const _TextEncoder = TextEncoder
const _TextDecoder = TextDecoder
export { _TextEncoder as TextEncoder, _TextDecoder as TextDecoder }
export default { TextEncoder, TextDecoder }
