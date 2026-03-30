interface VoxelData {
  dir: number
  z?: number
}

export type VoxelGrid = (VoxelData | number | undefined)[][][]

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
    if (!grid || grid.length === 0) {
      callback({state: "finished", data: grid ?? []})
      return {state: "finished", data: grid ?? []} as unknown as FinishedMessage
    }
    const numVoxelsX = grid.length - 1
    let numVoxelsY = 0
    let numVoxelsZ = 0
    for (const voxelPlane of grid) {
      if (!voxelPlane) continue
      numVoxelsY = Math.max(numVoxelsY, voxelPlane.length - 1)
      for (const voxelColumn of voxelPlane) {
        if (!voxelColumn) continue
        numVoxelsZ = Math.max(numVoxelsZ, voxelColumn.length - 1)
      }
    }

    this._resetProgress()

    for (let xNum = 0; xNum < grid.length; xNum++) {
      const voxelPlane = grid[xNum]
      if (!voxelPlane) continue
      for (let yNum = 0; yNum < voxelPlane.length; yNum++) {
        this._postProgress(callback, xNum, yNum, numVoxelsX, numVoxelsY)
        this._fillUp(grid, xNum, yNum, numVoxelsZ)
      }
    }
    callback({state: "finished", data: grid})
    return {state: "finished", data: grid} as unknown as FinishedMessage
  },

  // _fillUp: (grid, x, y, numVoxelsZ)

  _fillUp (grid: VoxelGrid, x: number, y: number, numVoxelsZ: number) {
    // fill up from z=0 to z=max
    if (!grid[x] || !grid[x][y]) return
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
    let zValue: number | undefined
    while ((zValue = zValues.pop()) !== undefined) {
      this._setVoxel(grid, x, y, zValue, voxelData)
    }
  },

  _setVoxel (grid: VoxelGrid, x: number, y: number, z: number, voxelData: number) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (grid[x] == null) {
      grid[x] = []
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (grid[x][y] == null) {
      grid[x][y] = []
    }
    if (grid[x][y][z] == null) {
      grid[x][y][z] = undefined
    }
    grid[x][y][z] = voxelData
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
