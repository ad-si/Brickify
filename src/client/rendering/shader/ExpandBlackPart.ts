import ShaderPart from "./ShaderPart.js"

export default class ExpandBlackPart extends ShaderPart {
  private kernelSize: number

  constructor (kernelSize: number) {
    super()
    this.getFragmentInMain = this.getFragmentInMain.bind(this)
    this.kernelSize = kernelSize
  }

  getVertexVariables () {
    return "\
varying vec2 texelDelta;\
"
  }

  getVertexInMain () {
    return "\
texelDelta.x = 1.0 / texWidth; \
texelDelta.y = 1.0 / texHeight;\
"
  }

  getFragmentVariables () {
    return "\
varying vec2 texelDelta;\
"
  }

  getFragmentInMain () {
    const k = this.kernelSize
    return `\
const int kernel = ${String(k)};\n \
bool isLine = false; \
\
for (int x = -1 * (kernel - 1); x < kernel; x++){\n \
for (int y = -1 * (kernel - 1); y < kernel; y++){\n \
float tx = vUv.s + float(x) * texelDelta.x;\n \
float ty = vUv.t + float(y) * texelDelta.y;\n \
\
vec3 c = texture2D( tColor, vec2(tx,ty)).rgb;\n \
\
if (c.r < 0.1 && c.g < 0.1 && c.b < 0.1){\n \
isLine = true;\n \
}\n \
} \
} \
if (isLine){ \
col.r = 0.0; \
col.g = 0.0; \
col.b = 0.0; \
}`
  }
}
