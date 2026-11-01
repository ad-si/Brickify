# Changelog

All notable changes to Brickify will be documented in this file.


## 2026-11-01 - [0.13.0]

### Added

- Added clickable test strip wizard for printer calibration
- Added loading spinner while switching LEGO assembly layers
- Added drag-and-drop hint to landing page
- Added Nix Flake for managing system dependencies


### Changed

- Render 3D model as see-through transparent with edges shining through
- Run CSG computation in a Web Worker
- Parse STL files in a Web Worker
- Skip rendering frames when nothing changed
- Disabled alpha buffer on WebGL canvas for better performance
- Allow plate merges across two rows to skip invalid 1x5 size
- Replaced Bootstrap modal and bootbox with native `<dialog>` element
- Stopped tracking built worker bundles in git
- Upgraded dependencies and meshlib to 0.8.1
- Improved type safety across codebase


### Fixed

- Fixed LEGO instructions download
- Fixed server startup
- Fixed text-encoding polyfill crash in browser bundle
- Fixed crashes on sparse voxel grids
- Fixed crash on undefined hotkey events from plugins
- Fixed crash on brush highlighting
- Restored transparent background of landing page previews


## 2026-01-22 - [0.12.0]

### Changed

- Upgraded all dependencies to latest versions
- Migrated from Mocha to Vitest for backend tests
- Migrated from Browserify to Vite for bundling
- Converted project from CoffeeScript to TypeScript
- Replaced Karma with Vite for frontend testing
- Updated ESLint config with strict type checking rules
- Simplified landing page with direct file drop and linked examples
- Renamed educators page to examples
- Updated team page with current maintainer info
- Moved examples preview to separate partial
- Removed LEGO trademark symbols for cleaner text
- Replaced convert arrow PNG with inline SVG
- Use relative worker paths for static builds
- Improved STL file loading with proper binary/ASCII detection
- Changed license to AGPL-3.0-or-later


### Added

- Added static HTML build for running without a server
- Added GitHub workflow to deploy to GitHub pages
- Added GitHub workflow for CI tests
- Added pre-built Web Workers to git for static builds
- Added missing Terser dependency
- Added description to readme


### Fixed

- Fixed type safety errors and test failures in data packet routes
- Fixed loading of plugins in static build
- Fixed mouse position calculation for highlighting
- Fixed memory leak caused by re-creating render targets every frame
- Fixed Node.clone() and Node.clipTo() methods in ThreeCSG
- Fixed OpenScadGenerator import to use default export
- Fixed blueimp-md5 import syntax
- Fixed filesaver.js by replacing with file-saver
- Fixed correct path for favicon
- Fixed bottom padding to footer


### Removed

- Removed Piwik tracking code
- Removed imprint page


## 2015-07-01 - [0.11.0]

### Added

- Added undo/redo functionality for brick actions
- Added undo support for brush actions and makeAll buttons
- Added buttons for undo/redo with hotkey display
- Added ExpandBlack to lego shadow for thicker outlines


### Changed

- Refactored everything lego/3d-printed methods
- Made undo data node-specific
- Set devicePixelRatio continuously to fix rendering issues
- Updated three-pointer-controls to 0.5.3
- Replaced orbit controls with pointer controls
- Enabled animation on landing page
- Configured quickconvert canvas elements for touch control
- Improved ballista sample model
- Optimized sample models with adjusted print times


### Fixed

- Fixed wireframe visualization after undo
- Fixed array method names and clearing
- Fixed hotkey display with multiple keys
- Fixed order of event listeners registration
- Fixed hint UI button identification
- Fixed instruction download
- Fixed caching bug in bricks neighbor cache
- Fixed brush highlighting in build mode
- Fixed setStudVisibility also setting brick fidelity
- Fixed showing brick layer functionality


### Removed

- Removed pojso caching as it doesn't update with new properties


## 2015-06-26 - [0.10.2]

### Fixed

- Fixed missing studs in assembly view (#669)
- Fixed assembly view if bottom is 3D print
- Fixed brush action if brick below is 3D print
- Fixed upper/lowercase require error in meshlib
- Fixed DownloadProvider filename
- Fixed development mode detection


### Changed

- Adjusted meshlib version
- Renamed DataHelper
- Improved fractionOfConnectionsInZDirection
- Updated CroJSDoc style documentation


## 2015-06-25 - [0.10.1]

### Fixed

- Fixed endless loop if bricks to relayout are a tower of stacked 1x1x1 plates
- Fixed condition for optimization
- Fixed test condition
- Set correct location header for successful datapacket create requests


### Changed

- Activated optimization for reLayout
- Extended express response mock to support location definition
- Updated client tests to new datapacket api
- Used POST method for datapacket creation
- Chained dataPacket routing verbs


### Removed

- Removed empty methods
- Removed duplicate variable declarations
- Removed debug newlines


## 2015-06-22 - [0.10.0]

### Added

- Added test strip wizard
- Added new download dialog


## 2015-06-06 - [0.9.3]

### Changed

- Bug fixes and improvements


## 2015-05-29 - [0.9.2]

### Changed

- Bug fixes and improvements


## 2015-05-28 - [0.9.1]

### Changed

- Bug fixes and improvements


## 2015-05-27 - [0.9.0]

### Changed

- Version update with various improvements


## 2015-04-30 - [0.8.0]

### Changed

- Major feature updates and improvements


## 2015-04-20 - [0.7.0]

### Changed

- Major feature updates and improvements


## 2015-03-27 - [0.6.0]

### Changed

- Major feature updates and improvements


## 2015-03-23 - [0.5.1]

### Changed

- Bug fixes and minor improvements


## 2015-03-11 - [0.5.0]

### Changed

- Major feature updates and improvements


## 2015-01-05 - [0.4.0]

### Changed

- Major feature updates and improvements


## 2014-12-10 - [0.3.0]

### Added

- Added landing page
- Added editor UI improvements


## 2014-11-05 - [0.2.0]

### Added

- Added STL viewer
- Added basic plugin architecture


## 2014-10-15 - [0.1.0]

### Added

- Initial project setup with skeleton code
- Basic project structure
- Express.js server setup
- Bootstrap integration
- Stylus CSS preprocessor
- Bower for frontend package management
- Three.js integration for 3D rendering
- Synchronized JSON states between client and server

[0.12.0]: https://github.com/ad-si/brickify/compare/v0.10.2...v0.12.0
[0.10.2]: https://github.com/ad-si/brickify/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/ad-si/brickify/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/ad-si/brickify/compare/v0.9.3...v0.10.0
[0.9.3]: https://github.com/ad-si/brickify/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/ad-si/brickify/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/ad-si/brickify/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/ad-si/brickify/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/ad-si/brickify/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ad-si/brickify/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ad-si/brickify/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/ad-si/brickify/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/ad-si/brickify/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ad-si/brickify/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ad-si/brickify/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ad-si/brickify/compare/45bbbe97...v0.2.0
[0.1.0]: https://github.com/ad-si/brickify/commits/45bbbe97
