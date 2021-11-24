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

# Usage

## Change geometric shape of the light border

A dropdown menu in the ambient light configuration allows you to change the light border from the default circle to a triangle, square, or hexagon. Rotating the light rotates the shape accordingly. 

For now, only the outside border shape is changed. If the light has a smaller bright than dim radius, the bright radius remains a circle. 

### Triangle

![Triangle-Shaped Light](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshot/screenshot/light_triangle.jpg)

### Square

![Square-Shaped Light](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshot/screenshot/light_triangle.jpg)

### Hexagon

![Hexagon-Shaped Light](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshot/screenshot/light_triangle.jpg)

### Light without border

![No Border Light](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshot/screenshot/light_none.jpg)

## Add custom walls to the light border

A text box lets you add one or more wall ids, for walls present on the canvas, as a comma-separated list. The specifications of these walls are then cached with the light object. Once added, you can delete the walls from the canvas and the light object will act as if the wall is still present on the canvas. 

For ease of use, a button allows you to add selected walls. To do so, open the light configuration. With it open, change to the wall layer. Draw walls if necessary, then select all the walls that you wish to cache with the light object. Hit the button and you should see the wall ids added as a comma-separate list to the text box. Save the configuration. At this point, you can remove the walls from the scene and the light object will still act as if the walls are still present.

This allows you, for example, to create a border around a pool of water or a fire pit, add a light, and ensure that the light remains solely within the border you designate. By then deleting the walls after, you can still allowing token movement over the area and token vision of the light. 


# Wishlist of future improvements

- Improve speed for rendering the line-of-sight polygon.
- Provide a preview when the user adds or modifies temporary walls.
- Switch the inside radius (bright --> dim transition) to match the chosen shape.
- Offer the same options for ambient sounds.
- Option to have no light border (unlimited radius). The "none" setting should accomplish this in theory but Foundry is still coloring the light as if it had a border. 



