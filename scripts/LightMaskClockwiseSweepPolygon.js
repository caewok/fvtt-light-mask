/* globals
ClockwiseSweepPolygon,
PolygonEdge,
Ray,
canvas
*/

`use strict`;

// Add boundary edges for designated shape 
// Done by extending ClockwiseSweepPolygon

import { log } from "./module.js";
import { MODULE_ID, SHAPE_KEY, CUSTOM_WALLS_KEY } from "./const.js";


export class LightMaskClockwiseSweepPolygon extends ClockwiseSweepPolygon {

  /**
   * Compute the polygon given a point origin and radius
   * @param {Point} origin            The origin source point
   * @param {object} [config={}]      Configuration options which customize the polygon computation
   * @returns {PointSourcePolygon}    The computed polygon instance
   */
//   static create(origin, config) {
//     log(`Creating CWPolygon at origin ${origin.x}, ${origin.y}. ${config?.object_id}`, config);
//   
//     const poly = new this();
//     poly.initialize(origin, config);
//     return poly.compute();
//   }

 /**
  * Configure the light id
  */
  initialize(origin, config) {
    log(`Initializing CWPolygon at origin ${origin.x}, ${origin.y}. ${config?.object_id}`, config);
    super.initialize(origin, config);
    this.config.object_id = config?.object_id;
  }

 /**
  * Add walls when adding canvas boundary edges.
  * Ensures that the walls could be properly trimmed by limited angle.
  */
  _addCanvasBoundaryEdges() {
    log(`Adding canvas boundary edges for ${this.config.type}`);
    
    // call the original.
    ClockwiseSweepPolygon.prototype._addCanvasBoundaryEdges.call(this);
    
    // check if we have a light and if so, if the shape mask has been set.
    if(!this.config.type === "light") return;
    
    log(`Object id is ${this?.config.object_id}.`);  
    if(!this?.config.object_id) return;
    
    // pull the light data
    const light = canvas.lighting.placeables.find(l => l.id === this.config.object_id);
    if(!light) {
      log(`Light ${light_source_id} not found. ${canvas.lighting.placeables.length} available.`, canvas.lighting.placeables, light);
      return;
    }
    
    // for a given shape, construct the edges
    const shape = light.data.flags?.[MODULE_ID]?.[SHAPE_KEY];
    if(!shape) return;
    
    log(`Adding walls for ${shape}.`);
    const angles = [];
    switch(shape) {
      case "circle": return;
      case "triangle": 
        angles.push(0, 120, 240);
        break;
      case "square":
        angles.push(0, 90, 180, 270);
        break;
      case "hexagon":
        angles.push(0, 60, 120, 180, 240, 300);
        break;
      case "none": return;  // ignore for now  
    }
    
    const poly_walls = this.constructGeometricShapeWalls(angles);
    poly_walls.forEach(w => this.edges.add(w))
    
  }
  
 /**
  * Build geometric shape from set of angles
  * Angles describe where the points should lie relative to origin.
  * Potentially rotated by rotation angle
  * Center/origin to point === radius
  * If a1 === 0, point would lie due east
  * Example:
  * constructGeometricShapeWalls([0, 120, 240]); // equilateral triangle
  * constructGeometricShapeWalls([45, 135, 225, 315]); // square
  * @return [CCWSweepWall, CCWSweepWall, CCWSweepWall]
  */
  constructGeometricShapeWalls(angles) {
    const origin = this.origin; 
    const rotation = this.config.rotation ?? 0;
    const radius = this.config.radius;

    // Use fromAngle to get the points relative to the origin
    const a_translated = angles.map(a => Math.normalizeRadians(Math.toRadians(a + rotation)));
    const r = a_translated.map(a => Ray.fromAngle(origin.x, origin.y, a, radius));
     
    // construct walls between the points
    const ln = angles.length;
    return r.map((p, idx)  => {
      const dest = (idx + 1) % ln;
      return new PolygonEdge(p.B, r[dest].B);
    });
  }
}