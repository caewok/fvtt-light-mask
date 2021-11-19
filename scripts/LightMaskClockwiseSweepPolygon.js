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
import { MODULE_ID, SHAPE_KEY, CUSTOM_EDGES_KEY } from "./const.js";


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
    const { type, object_id } = this.config;
  
    log(`Adding canvas boundary edges for ${type}`);
    
    // call the original.
    ClockwiseSweepPolygon.prototype._addCanvasBoundaryEdges.call(this);
    
    // check if we have a light and if so, if the shape mask has been set.
    if(!type === "light") return;
    
    log(`Object id is ${object_id}.`);  
    if(!object_id) return;
    
    // pull the light data
    const light = canvas.lighting.placeables.find(l => l.id === object_id);
    log(`Light`, light);
    if(!light) {
      log(`Light ${object_id} not found. ${canvas.lighting.placeables.length} available.`, canvas.lighting.placeables, light);
      return;
    }
    
    const shape = light.document.getFlag(MODULE_ID, SHAPE_KEY);
    if(shape === undefined) { return; }
    
    this._addGeometricEdges(shape);
    
    // add walls based on provided wall ids
    const edges_cache = light.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY);
    log(`${Object.keys(edges_cache).length} custom edges to add.`);
    Object.values(edges_cache).forEach(data => {
       const edge = new PolygonEdge({ x: data.c[0], y: data.c[1] },
                                    { x: data.c[2], y: data.c[3] },
                                    data[type]);
       this.edges.add(edge);
    });
  }
  
  
 /**
  * Adds geometric edges for the shape specified by the lightMask flag.
  */
  _addGeometricEdges(shape) {
    // for a given shape, construct the edges
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