[![Version (latest)](https://img.shields.io/github/v/release/caewok/fvtt-light-mask)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/caewok/fvtt-light-mask/releases/latest/download/module.json&label=Foundry%20Version&query=$.compatibility.verified&colorB=blueviolet)](https://github.com/caewok/fvtt-light-mask/releases/latest)
[![License](https://img.shields.io/github/license/caewok/fvtt-light-mask)](LICENSE)

![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https://forge-vtt.com/api/bazaar/package/lightmask&colorB=4aa94a)
![Latest Release Download Count](https://img.shields.io/github/downloads/caewok/fvtt-light-mask/latest/module.zip)
![All Downloads](https://img.shields.io/github/downloads/caewok/fvtt-light-mask/total)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H3Y7IJW)

# Light/Sound Mask

This module adds a toggle to Foundry VTT light and sound configuration to "mask" lights and sounds with a selected shape. Options:
- Default: Circle
- Ellipse
- Any regular polygon with 3+ sides
- Any regular star with 5+ sides
- No boundary
- Arbitrary set of lines by pasting in a set of wall ids. Once added, the walls can be removed if desired from the canvas; the configured light/sound will continue to apply them as a mask centered on the light location.

The chosen shape will be centered around the light/sound, sized to the light/sound radius, and will rotate if the light/sound is rotated.

Version 0.3.0 introduced the ability to mask token lights with a selected shape, just like masking other lights.

The 0.4 versions are the last to be compatible with Foundry v9.

The 0.5 versions requires Foundry v10.

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

The dropdown menu allows you to change the light/sound border from the default circle to any regular polygon (3+ sides) or star (5+ points). Rotating the light/sound rotates the shape accordingly, and the light/sound can be limited further by angle per Foundry defaults.

Only the outside border shape is changed. If the light has a smaller bright than dim radius, the bright radius remains a circle.

## Perfect Vision module
If you use the [Perfect Vision](https://github.com/dev7355608/perfect-vision) module, it will adjust the shape of the bright radius to match the geometric shape.

### Ellipse
<img src="https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_ellipse.jpg" width="400" alt="Ellipse-Shaped Light">

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

### Light/Sound without border ("None")

You can also select "None" to have the light extend across the canvas without a defined border. For maximum effect, set the dim or bright radius of the light to a large value.

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

This example shows how you could edit a simple fire pit to bound the light on all sides. This makes it easier to apply special effects constrained by the temporary walls you define. (This video is from version 0.1, but the same steps still apply.)
![Setting custom walls](https://raw.githubusercontent.com/caewok/fvtt-light-mask/feature/screenshots/screenshots/light_custom_border.webm)



