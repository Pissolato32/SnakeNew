# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed
- **Snake Growth:** Snakes now grow visually after eating food. This was fixed by ensuring `maxLength` and `radius` updates are sent from the server to the client.
- **Collision Detection:** Re-enabled snake-on-snake collision. This was fixed by correcting the `SpatialHashing` grid size to ensure nearby players are correctly identified for collision checks.

### Added
- Detailed technical explanations in commit messages to document the reasoning behind key changes.
- `DEBUG_MODE` flag for easier debugging.
- Lag compensation for player collision detection.

### Changed
- Refactored `GameLoop.js` to import the `Constants` module directly for better code clarity.