import ShaderPart from "./ShaderPart.js"

export default class PipelineTargetPart extends ShaderPart {
  getVertexInMain () {
    // Make this a screen aligned quad with z=0.5
    return "\
pos.x = pos.x; \
pos.y = pos.y; \
pos.z = 0.5; \
pos.w = 1.0;\
"
  }

  getFragmentVariables () {
    return "\
uniform sampler2D tDepth; \
uniform sampler2D tColor;\
"
  }

  getFragmentInMain () {
    // Keep the alpha sampled from the source target so per-pixel transparency
    // (e.g. for the transparent 3D model) survives compositing.
    return "\
col = texture2D( tColor, vUv ); \
\
float depth = texture2D( tDepth, vUv ).r; \
if (abs(1.0 - depth) < 0.00001){ \
discard; \
} \
gl_FragDepthEXT = depth;\
"
  }
}
