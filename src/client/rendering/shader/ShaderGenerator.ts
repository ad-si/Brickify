import type ShaderPart from "./ShaderPart.js"

// Type for shader code output
export interface ShaderCode {
  vertex: string;
  fragment: string;
}

/*
 * Takes several shader parts and creates a shader material out of it
 */
const ShaderGenerator = {
  generateShader (arrayOfParts: ShaderPart[]): ShaderCode {
    let vertexVariables = ""
    let vertexPreMain = ""
    let vertexInMain = ""
    let fragmentVariables = ""
    let fragmentPreMain = ""
    let fragmentInMain = ""

    for (const part of Array.from(arrayOfParts)) {
      vertexVariables += "\n"
      vertexVariables += part.getVertexVariables()
      vertexVariables += "\n"

      vertexPreMain += "\n"
      vertexPreMain += part.getVertexPreMain()
      vertexPreMain += "\n"

      vertexInMain += "\n"
      vertexInMain += part.getVertexInMain()
      vertexInMain += "\n"

      fragmentVariables += "\n"
      fragmentVariables += part.getFragmentVariables()
      fragmentVariables += "\n"

      fragmentPreMain += "\n"
      fragmentPreMain += part.getFragmentPreMain()
      fragmentPreMain += "\n"

      fragmentInMain += "\n"
      fragmentInMain += part.getFragmentInMain()
      fragmentInMain += "\n"
    }

    const vert = ShaderGenerator._generateVertexShader(
      vertexVariables, vertexPreMain, vertexInMain,
    )

    const frag = ShaderGenerator._generateFragmentShader(
      fragmentVariables, fragmentPreMain, fragmentInMain,
    )

    return {
      vertex: vert,
      fragment: frag,
    }
  },

  _generateVertexShader (variables: string, preMain: string, inMain: string): string {
    let shaderCode = "\
precision highp float; \
precision highp int; \
\
uniform float texWidth; \
uniform float texHeight; \
\
attribute vec3 position; \
attribute vec2 uv; \
\
varying vec2 vUv;\
"
    shaderCode += variables
    shaderCode += preMain
    shaderCode += "\
void main() { \
vUv = uv; \
vec4 pos = vec4(position.xyz, 1.0);\
\
" + inMain + "\
\
gl_Position = pos; \
}\
"
    return shaderCode
  },

  _generateFragmentShader (variables: string, preMain: string, inMain: string): string {
    let shaderCode = "\
#extension GL_EXT_frag_depth : enable\n \
precision highp float; \
precision highp int; \
\
uniform float texWidth; \
uniform float texHeight; \
\
varying vec2 vUv; \
uniform float opacity;\
"
    shaderCode += variables
    shaderCode += preMain
    shaderCode += "\
void main(){ \
vec4 col = vec4(0.0);\n \
float currentOpacity = opacity; \
\n\
" + inMain + "\
\n \
col.a *= currentOpacity; \
gl_FragColor = col; \
}\
"
    return shaderCode
  },
}

export default ShaderGenerator
