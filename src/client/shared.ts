// Shared dependencies that are used across multiple bundles
import $ from "jquery"
window.jQuery = window.$ = $

// THREE is provided via ESM import and exposed globally for legacy plugins
import THREE from "three"
window.THREE = THREE

import md5 from "blueimp-md5"
import clone from "clone"
import { saveAs } from "file-saver"
import "PEP"
import path from "path-browserify"
import "three-pointer-controls"
import ZeroClipboard from "zeroclipboard"

// Expose as globals for compatibility
window.md5 = md5
window.clone = clone
window.saveAs = saveAs
window.path = path
window.ZeroClipboard = ZeroClipboard
