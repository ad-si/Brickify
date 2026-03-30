import log from "loglevel"

import Brick from "../newBrickator/pipeline/Brick.js"

interface BrickSize {
  x: number;
  y: number;
  z: number;
}

interface BrickType {
  size: BrickSize;
  count: number;
  sizeIndex: number;
}

interface BrickInterface {
  getSize(): BrickSize;
}

// generates a list of how many bricks of which size
// is in the given set of bricks
export function generatePieceList (bricks: Set<BrickInterface> | Map<unknown, BrickInterface>): BrickType[] {
  const pieceList: BrickType[] = []

  bricks.forEach((brick: BrickInterface): void => {
    let brickType: BrickType | undefined
    for (brickType of Array.from(pieceList)) {
      if (Brick.isSizeEqual(brickType.size, brick.getSize())) {
        brickType.count++
        return
      }
    }

    const size = brick.getSize()
    const newBrickType: BrickType = {
      size: {
        x: Math.min(size.x, size.y),
        y: Math.max(size.x, size.y),
        z: size.z,
      },
      count: 1,
      sizeIndex: 0,
    }
    newBrickType.sizeIndex = Brick.getSizeIndex(newBrickType.size)
    pieceList.push(newBrickType)
  })

  // sort bricks from small to big
  pieceList.sort((a: BrickType, b: BrickType) => {
    if (a.size.x === b.size.x) {
      return a.size.y - b.size.y
    }
    else {
      return a.size.x - b.size.x
    }
  })

  return pieceList
}


export function getHtml (list: BrickType[], caption: boolean = true): string {
  let html = ""

  if (caption) {
    html = "<h3>Bricks needed</h3>"
  }

  html +=
    "<p>To build this model you need the following bricks:" +
    '<style type="text/css">' +
    ".partListTable td{vertical-align:middle !important;}" +
    "</style>" +
    '<table class="table partListTable">' +
    "<tr><th>Size</th>" +
    "<th>Type</th>" +
    "<th>Amount</th>" +
    "<th>Image</th></tr>"

  for (const piece of Array.from(list)) {
    let type: string
    if (piece.size.z === 1) {
      type = "Plate"
    }
    else if (piece.size.z === 3) {
      type = "Brick"
    }
    else {
      log.warn("Invalid LEGO height for piece list")
      continue
    }

    html +=
      "<tr>" +
      `<td>${String(piece.size.x)} x ${String(piece.size.y)}</td>` +
      `<td>${type}</td>` +
      `<td>${String(piece.count)}x</td>` +
      `<td><img src="img/partList/partList-${String(piece.sizeIndex + 1)}.png" height="40px"></td>` +
      "</tr>"
  }

  html += "</table></p>"
  return html
}
