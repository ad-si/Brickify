import THREE from "three"
import type {
  Scene,
  WebGLRenderTarget,
  WebGLRenderer,
  DepthTexture,
  ShaderMaterial,
  Mesh,
  Texture,
} from "three"

import PipelineTargetPart from "./shader/PipelineTargetPart.js"
import ShaderGenerator from "./shader/ShaderGenerator.js"
import type ShaderPart from "./shader/ShaderPart.js"

// Type for shader uniform values
interface ShaderUniform {
  type: string;
  value: unknown;
}

// Type for uniforms dictionary
type UniformsDictionary = Record<string, ShaderUniform>

// Type for render target descriptor
export interface RenderTargetDescriptor {
  depthTexture: DepthTexture;
  renderTarget: WebGLRenderTarget;
  quadScene: Scene;
  blendingMaterial: ShaderMaterial;
  dirty?: boolean;
}

// Extended WebGLRenderTarget with legacy properties from the custom Three.js fork
interface ExtendedWebGLRenderTarget extends WebGLRenderTarget {
  wrapS?: number;
  wrapT?: number;
  magFilter?: number;
  minFilter?: number;
}

// DepthTexture with internal WebGL reference
interface DepthTextureWithWebGL extends DepthTexture {
  __webglTexture?: WebGLTexture;
}

let _chooseBiggerSize = false
let _overrideSizeValue: number | null = null


export function configureSize (chooseBiggerSize: boolean, overrideSizeValue: number | null = null): number | null {
  _chooseBiggerSize = chooseBiggerSize
  return _overrideSizeValue = overrideSizeValue
}


/*
 * Creates a structure that can be used as a render target and later
 * to render the content of the render target
 * with a screen aligned quad to the screen.
 * @return {Object} the render target descriptor
 * @returnprop {THREE.WebGLRenderTarget} renderTarget the render target
 * @returnprop {THREE.DepthTexture} depthTexture depth texture used
 * with the render target
 * @returnprop {THREE.Scene} quadScene a scene which contains the screen
 * aligned quad
 * @returnprop {THREE.ShaderMaterial} blendingMaterial the material used to
 * render the screen aligned quad to the screen
 * @memberOf renderTargetHelper
 */
export function createRenderTarget (
  threeRenderer: WebGLRenderer,
  shaderParts?: ShaderPart[] | null,
  additionalUniforms?: UniformsDictionary | null,
  opacity?: number | null,
  textureMagFilter?: number,
  textureMinFilter?: number): RenderTargetDescriptor {

  // Create render target
  if (shaderParts == null) {
    shaderParts = []
  }
  if (additionalUniforms == null) {
    additionalUniforms = {}
  }
  if (opacity == null) {
    opacity = 1.0
  }
  if (textureMagFilter == null) {
    textureMagFilter = THREE.LinearFilter
  }
  if (textureMinFilter == null) {
    textureMinFilter = THREE.LinearFilter
  }
  const renderWidth = threeRenderer.domElement.width
  const renderHeight = threeRenderer.domElement.height

  let texWidth: number = getNextValidTextureDimension(renderWidth) as number
  let texHeight: number = getNextValidTextureDimension(renderHeight) as number

  if (_overrideSizeValue != null) {
    texWidth = _overrideSizeValue
    texHeight = _overrideSizeValue
  }

  const depthTexture = new THREE.DepthTexture(texWidth, texHeight, true as unknown as number)
  const renderTargetTexture = new THREE.WebGLRenderTarget(
    texWidth,
    texHeight,
    {
      minFilter: textureMinFilter,
      magFilter: textureMagFilter,
      format: THREE.RGBAFormat,
      depthTexture,
      stencilBuffer: true,
    },
  ) as ExtendedWebGLRenderTarget

  // Apply values to parent, due to broken THREE implementation / WIP pull request
  renderTargetTexture.wrapS = renderTargetTexture.texture.wrapS
  renderTargetTexture.wrapT = renderTargetTexture.texture.wrapT
  renderTargetTexture.magFilter = renderTargetTexture.texture.magFilter
  renderTargetTexture.minFilter = renderTargetTexture.texture.minFilter

  // Create scene to render texture
  const quadScene = new THREE.Scene()
  const screenAlignedQuad = generateQuad(
    renderTargetTexture, depthTexture, shaderParts, additionalUniforms, opacity,
  )
  quadScene.add(screenAlignedQuad)

  return {
    depthTexture,
    renderTarget: renderTargetTexture,
    quadScene,
    blendingMaterial: screenAlignedQuad.material as ShaderMaterial,
  }
}


// Clones the originalTarget but creates a new custom blendingMat shader
export function cloneRenderTarget (
  originalTarget: RenderTargetDescriptor,
  shaderParts?: ShaderPart[] | null,
  additionalUniforms?: UniformsDictionary | null,
  opacity?: number | null,
): RenderTargetDescriptor {

  // Create scene to render texture
  if (shaderParts == null) {
    shaderParts = []
  }
  if (additionalUniforms == null) {
    additionalUniforms = {}
  }
  if (opacity == null) {
    opacity = 1.0
  }
  const quadScene = new THREE.Scene()
  const screenAlignedQuad = generateQuad(
    originalTarget.renderTarget, originalTarget.depthTexture,
    shaderParts, additionalUniforms, opacity,
  )
  quadScene.add(screenAlignedQuad)

  return {
    depthTexture: originalTarget.depthTexture,
    renderTarget: originalTarget.renderTarget,
    quadScene,
    blendingMaterial: screenAlignedQuad.material as ShaderMaterial,
  }
}


// Generates an THREE.Mesh that will be displayed as a screen aligned quad
// and will draw the supplied rttTexture while setting the depth value to
// the values specified in rttDepthTexture
export function generateQuad (
  rttTexture: WebGLRenderTarget | Texture,
  rttDepthTexture: DepthTexture,
  shaderParts: ShaderPart[],
  additionalUniforms: UniformsDictionary,
  opacity: number,
): Mesh {
  let usedShaderParts: ShaderPart[] = []
  usedShaderParts.push(new PipelineTargetPart())
  usedShaderParts = usedShaderParts.concat(shaderParts)

  const shaderCode = ShaderGenerator.generateShader(usedShaderParts)

  // Get width/height from render target or texture
  const textureWidth = (rttTexture as WebGLRenderTarget).width
  const textureHeight = (rttTexture as WebGLRenderTarget).height

  const baseUniforms: UniformsDictionary = {
    tDepth: { type: "t", value: rttDepthTexture },
    tColor: { type: "t", value: rttTexture },
    opacity: { type: "f", value: opacity },
    texWidth: { type: "f", value: textureWidth },
    texHeight: { type: "f", value: textureHeight },
  }

  for (const attribute in additionalUniforms) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    baseUniforms[attribute] = additionalUniforms[attribute]!
  }

  // Use ShaderMaterial since RawShaderMaterial may not be available in the custom fork
  const mat = new (THREE as unknown as { RawShaderMaterial: typeof THREE.ShaderMaterial }).RawShaderMaterial({
    uniforms: baseUniforms,
    vertexShader: shaderCode.vertex,
    fragmentShader: shaderCode.fragment,
    transparent: true,
  })

  const planeGeometry = new (THREE as unknown as { PlaneBufferGeometry: typeof THREE.PlaneGeometry }).PlaneBufferGeometry(2, 2)
  const mesh = new THREE.Mesh( planeGeometry, mat )
  // Disable frustum culling since the plane is always visible
  mesh.frustumCulled = false
  return mesh
}


// Chooses the next 2^n size that matches the screen resolution best
export function getNextValidTextureDimension (size: number | null): number | null {
  if (size == null) {
    return null
  }

  const dims = [64, 128, 256, 512, 1024, 2048, 4096]

  let difference = 9999
  let selectedDim = 0
  for (const dim of Array.from(dims)) {
    const d = Math.abs( dim - size )
    if (d < difference) {
      difference = d
      selectedDim = dim
    }

    if (_chooseBiggerSize && (dim > size)) {
      return dim
    }
  }

  return selectedDim
}


// Returns true, if the render target has the right
// (in terms of 2^n, see getNextValidTextureDimension)
// size for the domElement of the threeRenderer
export function renderTargetHasRightSize  (renderTarget: WebGLRenderTarget, threeRenderer: WebGLRenderer): boolean {
  // Use .width/.height to match createRenderTarget (not clientWidth/clientHeight)
  const screenW = threeRenderer.domElement.width
  const screenH = threeRenderer.domElement.height

  let targetTexWidth = getNextValidTextureDimension(screenW)
  let targetTexHeight = getNextValidTextureDimension(screenH)

  if (_overrideSizeValue) {
    targetTexWidth = _overrideSizeValue
    targetTexHeight = _overrideSizeValue
  }

  return (renderTarget.width === targetTexWidth) &&
  (renderTarget.height === targetTexHeight)
}


export function deleteRenderTarget (renderTarget: RenderTargetDescriptor, threeRenderer: WebGLRenderer): void {
  renderTarget.renderTarget.dispose()

  const depthTextureWithWebGL = renderTarget.depthTexture as DepthTextureWithWebGL
  if (depthTextureWithWebGL.__webglTexture != null) {
    threeRenderer.context.deleteTexture(
      depthTextureWithWebGL.__webglTexture,
    )
  }
}
