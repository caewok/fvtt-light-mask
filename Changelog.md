## 0.4.1
Fix for [issue #11](https://github.com/caewok/fvtt-light-mask/issues/11). Avoid console errors when selecting modules in the Module Config screen.

## 0.4.0
Switch to better approach for injecting Light Mask settings into the light/sound configuration applications. This should greatly improve compatibility with other modules that might modify the light/sound configuration.

Setting the prototype token and world default token settings for Light Mask should now work properly. Removes the wall cache parameters when configuring a prototype token or default token because those must be set at a per-scene level for a given token.

Sound and Token configurations now refresh instantaneously when changing the parameters of a sound or light shape, respectively.

## 0.3.6
Fix when caching walls relative to a token, to prevent the walls from "shifting". Fixes [issue #10](https://github.com/caewok/fvtt-light-mask/issues/10)

## 0.3.5
Fix to catching multiple walls with unlimited vision (fix bounding box issues).

## 0.3.4
Fix to re-enable catching walls for light sources. (Accidentally borked in 0.3 series.)

## 0.3.3
Add option to use ellipses.

## 0.3.2
- Incorporate improvements from Walled Templates v0.3.0.
- Added localization to settings.

## 0.3.1
- Do not overwrite the origin object to improve compatibility with Wall Height. Fixes [issue #9](https://github.com/caewok/fvtt-light-mask/issues/9).
- Use Cohen-Sutherland approach to classifying zones around a rectangle to improve segment intersection identification.

## 0.3.0
Can now select shapes for token lighting.
- Simplify how Sweep algorithm uses methods from the source object to retrieve the boundaryPolygon and any temporary edges.

## 0.2.4
Fix [issue #8](https://github.com/caewok/fvtt-light-mask/issues/8). Points/Sides no longer hidden until shape changed.

## 0.2.3
Fix rendering error when using a limited angle close to 360º. Fixes [issue #6](https://github.com/caewok/fvtt-light-mask/issues/6) (redux).

## 0.2.2
Fix conflict with PerfectVision by switching ClipperLib to an internal-only import.

## 0.2.1
Fix conflict with walled template where both modules define the same getters.

## 0.2.0
Relies on a version of ClockwiseSweep that can accept arbitrary boundary polygons and temporary walls. Fixes [issue #6](https://github.com/caewok/fvtt-light-mask/issues/6).
- User can now specify any regular polygon with 3+ sides.
- User can now specify any star-shaped polygon with 5+ sides.
- Improvements to the UI/UX when selected shape types in the light and sound configurations to prevent the UI from jumping around on refresh.
- Add option to use the new ClockwiseSweep algorithm for all vision/lighting/sound for advanced users and testing.

## 0.1.2
Add checkbox to light/sound configuration that lets the user make the cached walls move relative to the light/sound object (closes #1). Fix storing of cached wall and relative origin data to the database so it remains after logging out and back in to Foundry (closes #3). Add a `canvasReady` hook to refresh the lights and sounds on first canvas load to avoid Foundry issue [#6227](https://gitlab.com/foundrynet/foundryvtt/-/issues/6227) and allow lights/sounds with cached walls to draw properly.

## 0.1.1
Fix potential bug when using limited angle lights or sounds.

## 0.1.0
Require Foundry 9.233 to avoid wall selection issues with 9.232.

## 0.0.4
Added equivalent geometric shapes and custom walls for sound objects. Switched to using templates to render the object configuration additions and added localization.

## 0.0.3
Updated for Foundry v9.232 (Testing 1).
- Use `config.source` instead of searching for light by id
- Update `identifyEdges`, particularly the canvas boundary creation
- Change size of the geometry to be slightly smaller than radius to avoid light-leakage issues.

## 0.0.2
Add pentagon, pentagram, and hexagram geometries. Align geometries to the grid when rotation is set to the default of 0.

## 0.0.1

Initial public release. Adds features to Ambient Lights in a scene:

- User can configure a light border to be triangle, square, hexagon, or none. (Default remains circle.)
- User can configure wall ids from the scene to a cache in the light; the light will continue to act as if those walls are present even if they are later removed.
- User can press button to capture selected walls, adding them as the cached wall ids.

