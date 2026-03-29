interface VoxelData {
  dir: number
  z?: number
}

type VoxelGrid = (VoxelData | number | undefined)[][][]

interface ProgressMessage {
  state: "progress"
  progress: number
}

interface FinishedMessage {
  state: "finished"
  data: VoxelGrid
}

type Callback = (message: ProgressMessage | FinishedMessage) => void

interface VolumeFillWorkerType {
  lastProgress: number
  fillGrid: (grid: VoxelGrid, callback: Callback) => FinishedMessage
  _fillUp: (grid: VoxelGrid, x: number, y: number, numVoxelsZ: number) => void
  _setVoxels: (grid: VoxelGrid, x: number, y: number, zValues: number[], voxelData: number) => void
  _setVoxel: (grid: VoxelGrid, x: number, y: number, z: number, voxelData: number) => void
  _resetProgress: () => void
  _postProgress: (callback: Callback, x: number, y: number, numVoxelsX: number, numVoxelsY: number) => void
}

const VolumeFillWorker: VolumeFillWorkerType = {
  lastProgress: -1,

  fillGrid (grid: VoxelGrid, callback: Callback): FinishedMessage {
    let voxelColumn: (VoxelData | number | undefined)[]
    let voxelPlane: (VoxelData | number | undefined)[][]
    let x: number | string
    let y: number | string
    const numVoxelsX = grid.length - 1
    let numVoxelsY = 0
    let numVoxelsZ = 0
    for (x in grid) {
      voxelPlane = grid[x as unknown as number]
      numVoxelsY = Math.max(numVoxelsY, voxelPlane.length - 1)
      for (y in voxelPlane) {
        voxelColumn = voxelPlane[y as unknown as number]
        numVoxelsZ = Math.max(numVoxelsZ, voxelColumn.length - 1)
      }
    }

    this._resetProgress()

    for (x in grid) {
      voxelPlane = grid[x as unknown as number]
      const xNum = parseInt(x)
      for (y in voxelPlane) {
        const yNum = parseInt(y)
        this._postProgress(callback, xNum, yNum, numVoxelsX, numVoxelsY)
        this._fillUp(grid, xNum, yNum, numVoxelsZ)
      }
    }
    return callback({state: "finished", data: grid}) as unknown as FinishedMessage
  },

  // _fillUp: (grid, x, y, numVoxelsZ)

  _fillUp (grid: VoxelGrid, x: number, y: number, numVoxelsZ: number) {
    // fill up from z=0 to z=max
    let insideModel = false
    let z = 0
    const currentFillVoxelQueue: number[] = []

    while (z <= numVoxelsZ) {
      if (grid[x][y][z] != null) {
        // current voxel already exists (shell voxel)
        const voxelData = grid[x][y][z] as VoxelData
        const dir = voxelData.dir

        this._setVoxels(grid, x, y, currentFillVoxelQueue, 0)

        if (dir === 1) {
          // leaving model
          insideModel = false
        }
        else if (dir === -1) {
          // entering model
          insideModel = true
        }
      }
      else {
        // voxel does not exist yet. create if inside model
        if (insideModel) {
          currentFillVoxelQueue.push(z)
        }
      }
      z++
    }
  },

  _setVoxels (grid: VoxelGrid, x: number, y: number, zValues: number[], voxelData: number) {
    return (() => {
      let zValue: number | undefined
      const result: void[] = []
      while (zValue = zValues.pop()) {
        result.push(this._setVoxel(grid, x, y, zValue, voxelData))
      }
      return result
    })()
  },

  _setVoxel (grid: VoxelGrid, x: number, y: number, z: number, voxelData: number) {
    if (grid[x] == null) {
      grid[x] = []
    }
    if (grid[x][y] == null) {
      grid[x][y] = []
    }
    if (grid[x][y][z] == null) {
      ;(grid[x][y] as any)[z] = undefined
    }
    ;(grid[x][y] as any)[z] = voxelData
  },

  _resetProgress () {
    this.lastProgress = -1
  },

  _postProgress (callback: Callback, x: number, y: number, numVoxelsX: number, numVoxelsY: number) {
    const progress = Math.round(
      (100 * ((((x - 1) * numVoxelsY) + y) - 1)) / numVoxelsX / numVoxelsY)
    if (!(progress > this.lastProgress)) {
      return
    }
    this.lastProgress = progress
    callback({state: "progress", progress})
  },
}

export default VolumeFillWorker
