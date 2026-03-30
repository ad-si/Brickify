// Patches the old CJS-only three.js fork to work with Node's ESM loader.
// The fork uses `module.exports = THREE`, which means Node ESM can only see
// a default export. This script generates an ESM wrapper that re-exports
// all named properties, and adds an `exports` map to three's package.json.

import { readFileSync, writeFileSync } from "fs"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const THREE = require("three")

const names = Object.keys(THREE).filter(k => /^[A-Za-z_$]/.test(k))

const wrapper = [
  `import THREE from "./build/three.js";`,
  `export default THREE;`,
  ...names.map(n => `export const ${n} = THREE.${n};`),
  "",
].join("\n")

const pkgPath = new URL("../node_modules/three/package.json", import.meta.url)
const wrapperPath = new URL("../node_modules/three/index.mjs", import.meta.url)

writeFileSync(wrapperPath, wrapper)

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
pkg.exports = {
  ".": {
    import: "./index.mjs",
    require: "./build/three.js",
  },
}
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
