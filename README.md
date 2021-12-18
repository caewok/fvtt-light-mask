[![Version (latest)](https://img.shields.io/github/v/release/caewok/fvtt-light-mask)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/caewok/fvtt-light-mask/releases/latest/download/module.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=blueviolet)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![License](https://img.shields.io/github/license/caewok/fvtt-light-mask)](LICENSE)

# Light/Sound Mask

This module adds a toggle to Foundry VTT light and sound configuration to "mask" lights and sounds with a selected shape. Options include:
- Triangle
- Square
- Pentagon
- Pentagram
- Hexagon
- Hexagram
- Arbitrary set of lines by pasting in a set of wall ids. Once added, the walls can be removed if desired from the canvas; the configured light/sound will continue to apply them as a mask centered on the light location. 

The chosen shape will be centered around the light/sound, sized to the light/sound radius, and will rotate if the light/sound is rotated.


# Installation

Add this [Manifest URL](https://github.com/caewok/fvtt-light-mask/releases/latest/download/module.json) in Foundry to install.

## Dependencies
- [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper)

## Known conflicts

None.

# Usage

Open the configuration for an Ambient Light in the scene and look for the Light Mask portion in the Advanced Options tab. For Ambient Sounds, the configuration is in the bottom of the main configuration screen. (Sounds do not currently have tabbed configurations.)
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_custom_ids.jpg" width="400" alt="Light Configuration Advanced Settings">

## Change geometric shape of the light/sound border

The dropdown menu allows you to change the light/sound border from the default circle to a triangle, square, or hexagon. Rotating the light/sound rotates the shape accordingly. 

For now, only the outside border shape is changed. If the light has a smaller bright than dim radius, the bright radius remains a circle. 

### Triangle
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_triangle.jpg" width="400" alt="Triangle-Shaped Light">

### Square
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_square.jpg" width="400" alt="Square-Shaped Light">

## Pentagon
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_pentagon.jpg" width="400" alt="Pentagon-Shaped Light">

### Hexagon
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_hexagon.jpg" width="400" alt="Hexagon-Shaped Light">

## Pentagram
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_pentagram.jpg" width="400" alt="Pentagram-Shaped Light">

## Hexagram
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_hexagram.jpg" width="400" alt="Hexagram-Shaped Light">

### Light/Sound without border

Note that Foundry still draws the light as a circle. Therefore, when using the "None" setting, set the dim light radius to a sufficiently large size to cover the area you want. Set the bright radius to match, or set it to 0, if you do not want the bright inner circle to appear.

![No Border Light](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_none.jpg)

## Add custom walls to the light/sound border

The text box lets you add one or more wall ids, for walls present on the canvas, as a comma-separated list. The specifications of these walls are then cached with the light/sound object. Once added, you can delete the walls from the canvas and the light object will act as if the wall is still present on the canvas. 

For ease of use, a button allows you to add selected walls. To do so, open the light/sound configuration. With it open, change to the wall layer. Draw walls if necessary, then select all the walls that you wish to cache with the light/sound object. Hit the button and you should see the wall ids added as a comma-separate list to the text box. Save the configuration. At this point, you can remove the walls from the scene and the light/sound object will still act as if the walls are still present.

This allows you, for example, to create a border around a pool of water or a fire pit, add a light, and ensure that the light remains solely within the border you designate. By then deleting the walls after, you can still allowing token movement over the area and token vision of the light. 

You can also check the "Relative" checkbox to make cached walls move with the light/sound object. So, for example, if you want "ice-cream cone" lights, you can cache two walls to form a "V" on a circle light to make the circle the ice cream sitting on the cone, then check relative so that if you drag your ice-cream cone light around, it keeps its shape.

See the fire pit video below for an example of setting custom walls.

# Example Videos

This is an example of changing a light in a scene to different geometries. 
![Different Light Geometries](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_shapes.webm)

This example shows how you could edit a simple fire pit to bound the light on all sides. This makes it easier to apply special effects constrained by the temporary walls you define. 
![Setting custom walls](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_custom_border.webm)

# Wishlist of future improvements

- Improve speed for rendering the line-of-sight polygon.
- Provide a preview when the user adds or modifies temporary walls.
- Switch the inside radius (bright --> dim transition) to match the chosen shape.
√ Offer the same options for ambient sounds.


