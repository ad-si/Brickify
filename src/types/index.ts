// Core application type definitions

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
}

export interface ColorsConfig {
  background: number;
  axisX: number;
  axisY: number;
  axisZ: number;
  gridNormal: number;
  grid5: number;
  grid10: number;
  basePlate: number;
  basePlateStud: number;
  modelColor: number;
  modelOpacity: number;
  modelOpacityLandingPage: number;
  modelShadowColor: number;
  modelShadowOpacity: number;
  brickShadowOpacity: number;
  objectShadowColorMult: number;
  objectColorMult: number;
}

export interface PluginsConfig {
  dummy: boolean;
  undo: boolean;
  coordinateSystem: boolean;
  legoBoard: boolean;
  newBrickator: boolean;
  nodeVisualizer: boolean;
  fidelityControl: boolean;
  editController: boolean;
  csg: boolean;
  legoInstructions: boolean;
}

export interface RenderingConfig {
  showShadowAndWireframe: boolean;
  showModel: boolean;
  usePipeline: boolean;
  transparentBackground: boolean;
}

export interface ControlsConfig {
  dolly: {
    minDistance: number;
    maxDistance: number;
  };
  animation: {
    afterInteraction: number;
  };
  [key: string]: unknown;
}

export interface StudSizeConfig {
  radius: number;
  height: number;
}

export interface HoleSizeConfig {
  radius: number;
  height: number;
}

export interface DownloadSettingsConfig {
  testStrip: boolean;
  stl: boolean;
  lego: boolean;
  steps: number;
}

export interface GlobalConfig {
  colors: ColorsConfig;
  fov: number;
  cameraNearPlane: number;
  cameraFarPlane: number;
  axisLength: number;
  axisLineWidth: number;
  gridLineWidthNormal: number;
  gridLineWidth5: number;
  gridLineWidth10: number;
  gridSize: number;
  gridStepSize: number;
  renderAreaId: string;
  staticRendererSize: boolean;
  staticRendererWidth: number;
  staticRendererHeight: number;
  buildUi: boolean;
  offerDownload: boolean;
  plugins: PluginsConfig;
  rendering: RenderingConfig;
  controls: ControlsConfig;
  minimalPrintVolume: number;
  studSize: StudSizeConfig;
  holeSize: HoleSizeConfig;
  gridSpacing: Vector3D;
  addStuds: boolean;
  exportStepSize: number;
  downloadSettings: DownloadSettingsConfig;
  legoInstructionResolution: number;
}

export interface ModelData {
  positions: Float32Array;
  normals?: Float32Array;
  indices?: Uint32Array;
}

export interface ParsedModel {
  name?: string;
  vertices: number[];
  faces: number[];
  normals?: number[];
}

export interface BoundingSphere {
  center: Vector3D;
  radius: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ImageData {
  viewWidth: number;
  viewHeight: number;
  imageWidth: number;
  imageHeight: number;
  pixels: Uint8Array;
}
