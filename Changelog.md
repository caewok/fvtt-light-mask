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

