// Shim for the 'text-encoding' npm package.
// Modern browsers ship native TextEncoder/TextDecoder,
// so the heavy polyfill (which crashes under strict-mode bundling) is unnecessary.
export { TextEncoder, TextDecoder }
export default { TextEncoder, TextDecoder }
