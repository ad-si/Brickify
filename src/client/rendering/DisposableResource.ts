import log from "loglevel"
import type { Object3D, Scene, Material, Texture, Geometry, BufferGeometry, WebGLRenderTarget } from "three"


// Interface for Three.js resources with potential disposal methods
interface ThreeResource {
  geometry?: Geometry | BufferGeometry;
  material?: Material | Material[];
  texture?: Texture;
  renderTarget?: WebGLRenderTarget;
  parent?: Object3D | null;
  dispose?: () => void;
}

// Interface for child disposables
interface ChildDisposable {
  dispose: () => void;
}

// Extended performance interface for Chrome memory info
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Material with texture properties
interface MaterialWithTextures extends Material {
  map?: Texture | null;
  lightMap?: Texture | null;
  bumpMap?: Texture | null;
  normalMap?: Texture | null;
  specularMap?: Texture | null;
  envMap?: Texture | null;
  alphaMap?: Texture | null;
  aoMap?: Texture | null;
  displacementMap?: Texture | null;
  roughnessMap?: Texture | null;
  metalnessMap?: Texture | null;
  [key: string]: unknown;
}

export default class DisposableResource {
  protected disposed: boolean
  protected disposables: Set<ThreeResource>
  protected childDisposables: Set<ChildDisposable>
  protected onDispose?: () => void

  constructor() {
    this.disposed = false
    this.disposables = new Set()
    this.childDisposables = new Set()
  }

  track<T extends ThreeResource>(resource: T): T {
    if (this.disposed) {
      log.warn('Attempting to track resource on already disposed object')
      this.disposeResource(resource)
      return resource
    }

    this.disposables.add(resource)
    return resource
  }

  trackChild<T extends ChildDisposable>(childDisposable: T): T {
    if (typeof childDisposable.dispose !== 'function') {
      log.warn('Attempting to track non-disposable child')
      return childDisposable
    }

    this.childDisposables.add(childDisposable)
    return childDisposable
  }

  untrack(resource: ThreeResource): void {
    this.disposables.delete(resource)
  }

  dispose(): void {
    if (this.disposed) {
      log.warn('Attempting to dispose already disposed resource')
      return
    }

    this.disposed = true

    // Dispose all child disposables first
    for (const child of this.childDisposables) {
      try {
        if (typeof child.dispose === 'function') {
          child.dispose()
        }
      } catch (error) {
        log.error('Error disposing child resource:', error)
      }
    }
    this.childDisposables.clear()

    // Dispose tracked Three.js resources
    for (const resource of this.disposables) {
      this.disposeResource(resource)
    }
    this.disposables.clear()

    // Call custom cleanup if implemented
    if (typeof this.onDispose === 'function') {
      try {
        this.onDispose()
      } catch (error) {
        log.error('Error in custom dispose method:', error)
      }
    }
  }

  disposeResource(resource: ThreeResource): void {
    try {
      // Handle Three.js geometries
      if (resource.geometry) {
        if (typeof resource.geometry.dispose === 'function') {
          resource.geometry.dispose()
        }
      }

      // Handle Three.js materials
      if (resource.material) {
        this.disposeMaterial(resource.material)
      }

      // Handle Three.js textures
      if (resource.texture && typeof resource.texture.dispose === 'function') {
        resource.texture.dispose()
      }

      // Handle render targets
      if (resource.renderTarget && typeof resource.renderTarget.dispose === 'function') {
        resource.renderTarget.dispose()
      }

      // Handle objects with direct dispose method
      if (typeof resource.dispose === 'function') {
        resource.dispose()
      }

      // Handle Three.js Object3D (remove from parent)
      if (resource.parent && typeof resource.parent.remove === 'function') {
        resource.parent.remove(resource as unknown as Object3D)
      }

    } catch (error) {
      log.error('Error disposing Three.js resource:', error, resource)
    }
  }

  disposeMaterial(material: Material | Material[]): void {
    try {
      if (Array.isArray(material)) {
        // Handle material arrays
        for (const mat of material) {
          this.disposeMaterial(mat)
        }
      } else {
        // Dispose material textures first
        const textureProperties = ['map', 'lightMap', 'bumpMap', 'normalMap',
                                  'specularMap', 'envMap', 'alphaMap', 'aoMap',
                                  'displacementMap', 'roughnessMap', 'metalnessMap']

        const matWithTextures = material as MaterialWithTextures
        for (const prop of textureProperties) {
          const texture = matWithTextures[prop]
          if (texture && typeof (texture as Texture).dispose === 'function') {
            (texture as Texture).dispose()
          }
        }

        // Dispose the material itself
        if (typeof material.dispose === 'function') {
          material.dispose()
        }
      }
    } catch (error) {
      log.error('Error disposing material:', error, material)
    }
  }

  isDisposed(): boolean {
    return this.disposed
  }

  // Helper method for Three.js scene cleanup
  static disposeScene(scene: Scene): void {
    const toDispose: Object3D[] = []

    scene.traverse((object: Object3D) => {
      toDispose.push(object)
    })

    // Dispose in reverse order to handle parent-child relationships
    for (let i = toDispose.length - 1; i >= 0; i--) {
      const object = toDispose[i]

      // Remove from parent
      if (object.parent) {
        object.parent.remove(object)
      }

      // Dispose geometry
      const meshLikeObject = object as unknown as ThreeResource
      if (meshLikeObject.geometry && typeof meshLikeObject.geometry.dispose === 'function') {
        meshLikeObject.geometry.dispose()
      }

      // Dispose material
      if (meshLikeObject.material) {
        DisposableResource.prototype.disposeMaterial(meshLikeObject.material)
      }
    }
  }

  // Helper method to get memory usage information
  static getMemoryInfo(): {
    supported: boolean;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } {
    const info = {
      supported: false,
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    }

    const perfWithMemory = performance as PerformanceWithMemory
    if (perfWithMemory.memory) {
      info.supported = true
      info.usedJSHeapSize = perfWithMemory.memory.usedJSHeapSize
      info.totalJSHeapSize = perfWithMemory.memory.totalJSHeapSize
      info.jsHeapSizeLimit = perfWithMemory.memory.jsHeapSizeLimit
    }

    return info
  }
}
