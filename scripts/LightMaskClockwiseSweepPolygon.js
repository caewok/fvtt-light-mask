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
  * Translate walls and other obstacles into edges which limit visibility
  * @private
  */
  _identifyEdges() {
    const {type, hasLimitedAngle, hasLimitedRadius, object_id} = this.config;

    // Add edges for placed Wall objects
    const walls = this._getWalls();
    for ( let wall of walls ) {
      if ( !this.constructor.testWallInclusion(wall, this.origin, type) ) continue;
      const edge = new PolygonEdge(wall.A, wall.B, wall.data[type]);
      this.edges.add(edge);
    }

    // Add edges for the canvas boundary
    // technically, we don't need this if we have a geometric boundary
    this._addCanvasBoundaryEdges();
    
    // For light mask, find the light data
    let light;
    if(typeof object_id === 'string' || object_id instanceof String) {
      light = canvas.lighting.placeables.find(l => l.id === object_id);
    } else {
      light = object_id;
    }
        
    if(!light) {
      log(`Light ${object_id} not found. ${canvas.lighting.placeables.length} available.`, canvas.lighting.placeables, light);
    }
    
    // We would prefer to add edges here so they can be trimmed by limited angle
    // This requires that radius constraint not remove the geometric shape boundary...
    this._addGeometricEdges(light);
    this._addCustomEdges(light);  

    // Restrict edges to a limited angle
    if ( hasLimitedAngle ) {
      this._restrictEdgesByAngle();
    }
    
    // Don't use radius limitation if the shape is "none"
    const trim_radius = !light || light.document.getFlag(MODULE_ID, SHAPE_KEY) !== "none";

    // Constrain edges to a limited radius
    // we want this even if we have added geometric shape edges b/c we can still trim
    // by radius
    if ( hasLimitedRadius && trim_radius) {
      this._constrainEdgesByRadius();
    }
    
    // Drop the radius constraint going forward for non-circular shapes. 
    // (don't need padding)
    const drop_padding = hasLimitedRadius && light &&
                        light.document.getFlag(MODULE_ID, SHAPE_KEY) !== "circle";
                        
    if(drop_padding) {
      const cfg = this.config;
      cfg.radius = 0; 
      this.initialize(this.origin, cfg);
    }                    
  }

 /**
  * Add edges based on any custom edges supplied by the user.
  * @param {AmbientLight} light
  */
  _addCustomEdges(light) {
    if(!light) return;
    
    const type = this.config.type;
    const edges_cache = light.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY);
    log(`${Object.keys(edges_cache).length} custom edges to add.`);
    Object.values(edges_cache).forEach(data => {
       log(`Adding custom edge ${data._id}`);
       const edge = new PolygonEdge({ x: data.c[0], y: data.c[1] },
                                    { x: data.c[2], y: data.c[3] },
                                    data[type]);
       this.edges.add(edge);
    });
  } 
  
  
 /**
  * Adds geometric edges for the shape specified by the lightMask flag.
  * @param {AmbientLight} light
  */
  _addGeometricEdges(light) {
    if(!light) return;
    const shape = light.document.getFlag(MODULE_ID, SHAPE_KEY);
    if(!shape) { return; }
   
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