[![Version (latest)](https://img.shields.io/github/v/release/caewok/fvtt-light-mask)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/caewok/fvtt-light-mask/releases/latest/download/module.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=blueviolet)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![License](https://img.shields.io/github/license/caewok/fvtt-light-mask)](LICENSE)

# Light Mask

This module adds a toggle to Foundry VTT light configuration to "mask" the lights with a selected shape. Options include:
- Triangle
- Square
- Hexagon
- Arbitrary set of lines by pasting in a set of wall ids. Once added, the walls can be removed if desired from the canvas; the configured light will continue to apply them as a mask centered on the light location. 

The chosen shape will be centered around the light, sized to the light radius, and will rotate if the light is rotated.


# Installation

Add this [Manifest URL](https://github.com/caewok/fvtt-light-mask/releases/latest/download/module.json) in Foundry to install.

## Dependencies
- [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper)

## Known conflicts

None.


