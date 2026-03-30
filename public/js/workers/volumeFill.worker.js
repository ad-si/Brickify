//#region src/plugins/newBrickator/pipeline/voxelization/VolumeFillWorker.ts
var VolumeFillWorker = {
	lastProgress: -1,
	fillGrid(grid, callback) {
		const numVoxelsX = grid.length - 1;
		let numVoxelsY = 0;
		let numVoxelsZ = 0;
		for (const voxelPlane of grid) {
			numVoxelsY = Math.max(numVoxelsY, voxelPlane.length - 1);
			for (const voxelColumn of voxelPlane) numVoxelsZ = Math.max(numVoxelsZ, voxelColumn.length - 1);
		}
		this._resetProgress();
		for (let xNum = 0; xNum < grid.length; xNum++) {
			const voxelPlane = grid[xNum];
			for (let yNum = 0; yNum < voxelPlane.length; yNum++) {
				this._postProgress(callback, xNum, yNum, numVoxelsX, numVoxelsY);
				this._fillUp(grid, xNum, yNum, numVoxelsZ);
			}
		}
		callback({
			state: "finished",
			data: grid
		});
		return {
			state: "finished",
			data: grid
		};
	},
	_fillUp(grid, x, y, numVoxelsZ) {
		let insideModel = false;
		let z = 0;
		const currentFillVoxelQueue = [];
		while (z <= numVoxelsZ) {
			if (grid[x][y][z] != null) {
				const dir = grid[x][y][z].dir;
				this._setVoxels(grid, x, y, currentFillVoxelQueue, 0);
				if (dir === 1) insideModel = false;
				else if (dir === -1) insideModel = true;
			} else if (insideModel) currentFillVoxelQueue.push(z);
			z++;
		}
	},
	_setVoxels(grid, x, y, zValues, voxelData) {
		let zValue;
		while ((zValue = zValues.pop()) !== void 0) this._setVoxel(grid, x, y, zValue, voxelData);
	},
	_setVoxel(grid, x, y, z, voxelData) {
		if (grid[x] == null) grid[x] = [];
		if (grid[x][y] == null) grid[x][y] = [];
		if (grid[x][y][z] == null) grid[x][y][z] = void 0;
		grid[x][y][z] = voxelData;
	},
	_resetProgress() {
		this.lastProgress = -1;
	},
	_postProgress(callback, x, y, numVoxelsX, numVoxelsY) {
		const progress = Math.round(100 * ((x - 1) * numVoxelsY + y - 1) / numVoxelsX / numVoxelsY);
		if (!(progress > this.lastProgress)) return;
		this.lastProgress = progress;
		callback({
			state: "progress",
			progress
		});
	}
};
//#endregion
//#region src/plugins/newBrickator/pipeline/voxelization/volumeFill.worker.ts
self.onmessage = (event) => {
	const { type, data } = event.data;
	if (type === "fillGrid") {
		const { gridPOJO } = data;
		const callback = (message) => {
			self.postMessage(message);
		};
		try {
			VolumeFillWorker.fillGrid(gridPOJO, callback);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			self.postMessage({
				state: "error",
				error: errorMessage
			});
		}
	}
};
//#endregion
