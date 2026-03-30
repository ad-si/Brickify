const scadDisclaimer = `
/**
 * Brick layout for OpenSCAD
 * Generated with https://github.com/ad-si/brickify
 *
 */

`

const scadBase = `
gridSpacing = [ 8, 8, 3.2 ];
brickSpacing = [ 0.2, 0.2, 0.2 ];
studRadius = 2.4;
holeRadius = 2.6;
studHeight = 1.8;

module GridTranslate(position) {
  translate([
    position[0] * gridSpacing[0] + brickSpacing[0] / 2,
    position[1] * gridSpacing[1] + brickSpacing[1] / 2,
    position[2] * gridSpacing[2]
  ]) {
    children();
  }
}

module Brick(size) {
  difference() {
    union() {
      cube(
          [
            size[0] * gridSpacing[0] - brickSpacing[0],
            size[1] * gridSpacing[1] - brickSpacing[1],
            size[2] * gridSpacing[2] - brickSpacing[2]
          ],
          false);

      for (sx = [1:size[0]]) {
        for (sy = [1:size[1]]) {
          tx = sx * gridSpacing[0] - gridSpacing[0] / 2 - brickSpacing[0] / 2;
          ty = sy * gridSpacing[1] - gridSpacing[1] / 2 - brickSpacing[1] / 2;
          tz = size[2] * gridSpacing[2] - brickSpacing[2];
          translate([ tx, ty, tz ]) {
            cylinder(r = studRadius, h = studHeight, $fs = 0.5);
          }
        }
      }
    }
    union() {
      for (sx = [1:size[0]]) {
        for (sy = [1:size[1]]) {
          tx = sx * gridSpacing[0] - gridSpacing[0] / 2 - brickSpacing[0] / 2;
          ty = sy * gridSpacing[1] - gridSpacing[1] / 2 - brickSpacing[1] / 2;
          tz = 0;
          translate([ tx, ty, tz - brickSpacing.z ]) {
            cylinder(r = holeRadius, h = 2 + brickSpacing.z, $fs = 0.5);
          }
        }
      }
    }
  }
}
`

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Brick {
  getPosition(): Vector3;
  getSize(): Vector3;
}

function toScadVector (vector: Vector3): string {
  return `[${String(vector.x)}, ${String(vector.y)}, ${String(vector.z)}]`
}

export default function generateScad (bricks: Brick[]) {
  let scad = scadDisclaimer

  bricks.forEach((brick) => {
    const pos = toScadVector(brick.getPosition())
    const size = toScadVector(brick.getSize())
    return scad += `GridTranslate(${pos}){ Brick(${size}); }\n`
  })

  scad += "\n\n"
  scad += scadBase

  return {
    fileName: "bricks.scad",
    data: scad,
  }
}
