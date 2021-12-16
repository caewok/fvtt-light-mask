/* globals
ClockwiseSweepPolygon,
PolygonEdge,
PolygonVertex,
Ray,
canvas, 
foundry,
CONST,
game
*/

`use strict`;

// Add boundary edges for designated shape 
// Done by extending ClockwiseSweepPolygon

import { log } from "./module.js";
import { MODULE_ID, SHAPE_KEY, CUSTOM_EDGES_KEY, ROTATION_KEY } from "./const.js";


export class LightMaskClockwiseSweepPolygon extends ClockwiseSweepPolygon {

  initialize(origin, config) {
    super.initialize(origin, config);
    
    const cfg = this.config;
    cfg.shape = cfg.source.object.document.getFlag(MODULE_ID, SHAPE_KEY) || "circle";
    cfg.rotation = cfg.source.object.document.getFlag(MODULE_ID, ROTATION_KEY) || cfg.rotation;
    
  }

  /**
   * Compute the polygon given a point origin and radius
   * @param {Point} origin            The origin source point
   * @param {object} [config={}]      Configuration options which customize the polygon computation
   * @returns {PointSourcePolygon}    The computed polygon instance
   */
    
  /** @inheritdoc */
  _compute() {
    const { hasLimitedRadius, shape } = this.config;

    // Step 1 - Identify candidate edges
    this._identifyEdges();

    // Step 2 - Construct vertex mapping
    this._identifyVertices();
    
    // Drop the radius constraint going forward for non-circular shapes. 
    // (needed radius to trim edges in Step 1)
    // (needed radius to detect if intersections w/in radius for Step 2)
    // (don't need radius padding in Step 3 b/c not a circle)
    // For light mask, find the light data
    const drop_padding = hasLimitedRadius && shape !== "circle";
                        
    if(drop_padding) {
      this.config.hasLimitedRadius = false;
    }       

    // Step 3 - Radial sweep over endpoints
    this._executeSweep();

    // Step 4 - Build polygon points
    this._constructPolygonPoints();
  }

 /**
  * Translate walls and other obstacles into edges which limit visibility
  * @private
  */
  _identifyEdges() {
    const {type, hasLimitedAngle, hasLimitedRadius, shape} = this.config;

    // Add edges for placed Wall objects
    const walls = this._getWalls();
    for ( let wall of walls ) {
      if ( !this.constructor.testWallInclusion(wall, this.origin, type) ) continue;
      const edge = LightMaskPolygonEdge.fromWall(wall, type);
      this.edges.add(edge);
    }

    // Add edges for the canvas boundary
    for ( let boundary of canvas.walls.boundaries ) {
      this.edges.add(LightMaskPolygonEdge.fromWall(boundary));
    }
    
    // We would prefer to add edges here so they can be trimmed by limited angle
    // This requires that radius constraint not remove the geometric shape boundary...
    this._addGeometricEdges();
    this._addCustomEdges();  

    // Restrict edges to a limited angle
    if ( hasLimitedAngle ) {
      this._restrictEdgesByAngle();
    }
    
    // Don't use radius limitation if the shape is "none"
    const trim_radius = shape !== "none";

    // Constrain edges to a limited radius
    // we want this even if we have added geometric shape edges b/c we can still trim
    // by radius
    if ( hasLimitedRadius && trim_radius) {
      this._constrainEdgesByRadius();
    }
    
           
  }
  
 /**
  * Adds geometric edges for the shape specified by the lightMask flag.
  * @param {AmbientLight} light
  */
  _addGeometricEdges() {    
    const { shape } = this.config;
   
    log(`Adding walls for ${shape}.`);
    const angles = [];
    switch(shape) {
      case "circle": return; 
      case "triangle": 
        angles.push(30, 150, 270); // 0, 120, 240 + 30
        break;
      case "square":
        angles.push(45, 135, 225, 315); // 0, 90, 180, 270 + 45
        break;
      case "pentagon":
      case "pentagram":
        angles.push(54, 126, 198, 270, 342); // 0, 72, 144, 216, 288 + 54
        break;  
      case "hexagon":
      case "hexagram":
        angles.push(0, 60, 120, 180, 240, 300);
        break;        
      case "none": return;  // ignore for now  
    }
    
    const star = shape === "pentagram" ? true :
                 shape === "hexagram"  ? true :
                 false;
    
    
    const poly_walls = star ? this.constructGeometricStarWalls(angles) : 
                              this.constructGeometricShapeWalls(angles);
        
    // for tracking intersections
    // don't need to compare against each other b/c we know these boundaries
    // do not intersect.
    const edges_array = Array.from(this.edges);
    poly_walls.forEach(e => e.identifyIntersections(edges_array));
    poly_walls.forEach(e => this.edges.add(e));  
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
  * @param {number} angles
  * @return CCWSweepWall[]
  */
  constructGeometricShapeWalls(angles) {
    const origin = this.origin; 
    const rotation = this.config.rotation ?? 0;
    const radius = Math.max(this.config.radius - 1, 0); // ensure we are definitely inside the radius. Otherwise, the edges may get trimmed when radius is checked, causing light leakage.

    // Use fromAngle to get the points relative to the origin
    const a_translated = angles.map(a => Math.normalizeRadians(Math.toRadians(a + rotation)));
    const r = a_translated.map(a => Ray.fromAngle(origin.x, origin.y, a, radius));
     
    // construct walls between the points
    const ln = angles.length;
    return r.map((p, idx)  => {
      const dest = (idx + 1) % ln;
      return new LightMaskPolygonEdge(p.B, r[dest].B);
    });
  }
  
 /**
  * Add edges to make a pentagram or hexagram shape.
  * Angles describe where the outside points lie relative to the origin.
  * Potentially rotated by rotation angle
  * Center/origin to point === radius
  * If a1 === 0, point would lie due east
  * Diagonals are drawn to construct a star 
  * and the outside edges of the star are returned.
  * Example:
  * constructGeometricStarWalls([0, 72, 144, 216, 288]) // pentagram
  * constructGeometricStarWalls([0, 60, 120, 180, 240, 300]) // hexagram
  * @param {number} outside_angles
  * @return CCWSweepWall[]
  */
  constructGeometricStarWalls(outside_angles) {
    const origin = this.origin; 
    const rotation = this.config.rotation;
    const radius = Math.max(this.config.radius - 1, 0);
    const ln = outside_angles.length;
        
    // Use fromAngle to get the outside points relative to the origin
    // each outside point is Ray.B
    const outside_angles_translated = outside_angles.map(a => Math.normalizeRadians(Math.toRadians(a + rotation)));
    const r = outside_angles_translated.map(a => Ray.fromAngle(origin.x, origin.y, a, radius));
    
    // construct five segments connecting the outside points to form a star
    const diagonals = r.map((p, idx) => {
      const dest = (idx + 2) % ln;
      return new Ray(p.B, r[dest].B);
    }); 
   
    // construct the outside edges of the star by locating the relevant intersections
    // ensure the edges connect by re-using the intersections
    const ix = diagonals.map((d, idx) => {
      const near = (idx + (ln - 1)) % ln;
      const near_d = diagonals[near];
      return foundry.utils.lineLineIntersection(d.A, d.B, near_d.A, near_d.B);
    });
    
    const edges = [];
    diagonals.forEach((d, idx) => {
      // diagonal goes A -- x1 -- x2 -- B
      // e1 is A -- x1; e2 is x2 -- B
      const x1 = ix[idx];
      const x2 = ix[(idx + 1) % ln];
      
      const e1 = new LightMaskPolygonEdge(d.A, x1);
      const e2 = new LightMaskPolygonEdge(x2, d.B);
      
      edges.push(e1, e2);    
    });
    
    return edges;
  } 
  
  
 /**
  * Add edges based on any custom edges supplied by the user.
  * @param {AmbientLight} light
  */
  _addCustomEdges() {
    const { type, source } = this.config;
    
    const edges_cache = source.object.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY);
    if(!edges_cache || edges_cache.length === 0) return;
    
    log(`${edges_cache.length} custom edges to add.`);
    edges_cache.forEach(data => {
      log(`Adding custom edge ${data.id}`);
      const edge = new LightMaskPolygonEdge({ x: data.c[0], y: data.c[1] },
                                             { x: data.c[2], y: data.c[3] },
                                             data[type]);
                                                                                          
      // for tracking intersections                             
      const edges_array = Array.from(this.edges);
      edge.identifyIntersections(edges_array);                              
      this.edges.add(edge);
    });
  } 
    
  /* -------------------------------------------- */
  /*  Vertex Identification                       */
  /* -------------------------------------------- */

  // Override Vertex methods to handle LightMaskPolygonEdge
  // Namely, the switch to edge.intersectsWith instead of edge.wall.intersectsWith

  /**
   * Consolidate all vertices from identified edges and register them as part of the vertex mapping.
   * @private
   */
  _identifyVertices() {
    const {hasLimitedAngle, rMin, rMax} = this.config;
    const wallEdgeMap = new Map();

    // Register vertices for all edges
    for ( let edge of this.edges ) {

      // Get unique vertices A and B
      const ak = edge.A.key;
      if ( this.vertices.has(ak) ) edge.A = this.vertices.get(ak);
      else this.vertices.set(ak, edge.A);
      const bk = edge.B.key;
      if ( this.vertices.has(bk) ) edge.B = this.vertices.get(bk);
      else this.vertices.set(bk, edge.B);

      // Learn edge orientation with respect to the origin
      const o = foundry.utils.orient2dFast(this.origin, edge.A, edge.B);

      // Ensure B is clockwise of A
      if ( o > 0 ) {
        let a = edge.A;
        edge.A = edge.B;
        edge.B = a;
      }

      // Attach edges to each vertex
      edge.A.attachEdge(edge, -1);
      edge.B.attachEdge(edge, 1);

      // Record the wall->edge mapping
      //if ( edge.wall ) wallEdgeMap.set(edge.id, edge);
      wallEdgeMap.set(edge.id, edge);
    }

    // Add edge intersections
    this._identifyIntersections(wallEdgeMap);

    // For limited angle polygons, restrict vertices
    if ( hasLimitedAngle ) {
      for ( let vertex of this.vertices.values() ) {
        if ( !vertex._inLimitedAngle ) this.vertices.delete(vertex.key);
      }

      // Add vertices for the endpoints of bounding rays
      const vMin = PolygonVertex.fromPoint(rMin.B);
      this.vertices.set(vMin.key, vMin);
      const vMax = PolygonVertex.fromPoint(rMax.B);
      this.vertices.set(vMax.key, vMax);
    }
  }

  /* -------------------------------------------- */

  /**
   * Add additional vertices for intersections between edges.
   * @param {Map<string,PolygonEdge>} wallEdgeMap    A mapping of wall IDs to PolygonEdge instances
   * @private
   */
  _identifyIntersections(wallEdgeMap) {
    const { hasLimitedAngle, rMin, rMax } = this.config;
     
    const processed = new Set();
    const o = this.origin;
    for ( let edge of this.edges ) {

      // If the edge has no intersections, skip it
      if ( !edge.intersectsWith.size ) continue;

      // Check each intersecting wall
      for ( let [id, i] of edge.intersectsWith.entries() ) {

        // Some other walls may not be included in this polygon
        const other = wallEdgeMap.get(id);
        if ( !other || processed.has(other) ) continue;

        // Verify that the intersection point is still contained within the radius
        const r2 = Math.pow(i.x - o.x, 2) + Math.pow(i.y - o.y, 2);
        if ( r2 > this.config.radius2 ) continue;

        // Register the intersection point as a vertex
        let v = PolygonVertex.fromPoint(i);
        if ( this.vertices.has(v.key) ) v = this.vertices.get(v.key);
        else {
          // if limited angle, test for inclusion
          if(hasLimitedAngle) {      
            v._inLimitedAngle = this.constructor.pointBetweenRays(v, rMin, rMax);
          } 
          
          this.vertices.set(v.key, v);
        }
        if ( !v.edges.has(edge) ) v.attachEdge(edge, 0);
        if ( !v.edges.has(other) ) v.attachEdge(other, 0);
      }
      processed.add(edge);
    }
  }
  
  /**
   * Override to avoid deleting the constrained edge, which breaks the id relationship
   * with wall intersections
   *
   * Process the candidate edges to further constrain them using a circular radius of effect.
   * @private
   */
  _constrainEdgesByRadius() {
    const {hasLimitedAngle, radius, rMin, rMax} = this.config;
    const constrained = [];
    for ( let edge of this.edges ) {
      const x = foundry.utils.lineCircleIntersection(edge.A, edge.B, this.origin, radius);

      // Fully outside - remove this edge
      if ( x.outside ) {
        this.edges.delete(edge);
        continue
      }

      // Fully contained - include this edge directly
      if ( x.contained ) continue;

      // Partially contained - partition the edge into the constrained segment
      const points = x.intersections;
      if ( x.aInside ) points.unshift(edge.A);
      if ( x.bInside ) points.push(edge.B);

      // Create a partitioned segment
      //this.edges.delete(edge);
      //const c = new PolygonEdge(points.shift(), points.pop(), edge.type, edge.wall);
      edge.A = points.shift();
      edge.B = points.pop();
      const c = edge;
      
      if ( c.A.equals(c.B) ) continue;  // Skip partitioned edges with length zero
      constrained.push(c);

      // Flag partitioned points which reached the maximum radius
      if ( !x.aInside ) c.A._distance = 1;
      if ( !x.bInside ) c.B._distance = 1;
    }

    // Add new edges back to the set
    for ( let e of constrained ) {
      //this.edges.add(e);

      // If we have a limited angle, we need to re-check whether the constrained points are inside
      if ( hasLimitedAngle ) {
        e.A._inLimitedAngle = this.constructor.pointBetweenRays(e.A, rMin, rMax);
        e.B._inLimitedAngle = this.constructor.pointBetweenRays(e.B, rMin, rMax);
      }
    }
  }
     
  
}

/**
 * Compare function to sort point by x, then y coordinates
 * @param {Point} a
 * @param {Point} b
 * @return {-1|0|1} 
 */
function compareXY(a, b) {
  if(a.x === b.x) {
    if(a.y === b.y) { return 0; }
    return a.y < b.y ? -1 : 1;
  } else {
    return a.x < b.x ? -1 : 1; 
  }
}


class LightMaskPolygonEdge extends PolygonEdge {
  constructor(a, b, type=CONST.WALL_SENSE_TYPES.NORMAL, wall) {
    super(a, b, type, wall);
    

    this._A = this.A;
    this._B = this.B;
    
    this._leftEndpoint = undefined;
    this._rightEndpoint = undefined; 
    
    // Need to copy the existing wall intersections in an efficient manner
    // Temporary walls may add more intersections, and we don't want those 
    // polluting the existing set.
    this.intersectsWith = new Map();
    
    if(this.wall) {
      this.id = this.wall.id; // copy the id so intersectsWith will match for all walls.
      this.wall.intersectsWith.forEach((x, key) => {
        // key was the entire wall; just make it the id for our purposes
        this.intersectsWith.set(key.id, x);
      });
      
    } else {
      this.id = foundry.utils.randomID();
    }
  }
  
 /**
  * Identify which endpoint is further west, or if vertical, further north.
  * @type {Point}
  */
  get leftEndpoint() {
    if(typeof this._leftEndpoint === "undefined") {
      const is_left = compareXY(this.A, this.B) === -1;
      this._leftEndpoint = is_left ? this.A : this.B;
      this._rightEndpoint = is_left ? this.B : this.A;
    }
    return this._leftEndpoint;
  }
  
 /**
  * Identify which endpoint is further east, or if vertical, further south.
  * @type {Point}
  */
  get rightEndpoint() {
    if(typeof this._rightEndpoint === "undefined") {
      this._leftEndpoint = undefined;
      this.leftEndpoint; // trigger endpoint identification
    }
    return this._rightEndpoint;
  }
  
  // We need to use setters for A and B so we can reset the left/right endpoints
  // if A and B are changed
  
 /**
  * @type {Point}
  */ 
  get A() {
    return this._A;    
  }
  
 /**
  * @type {Point}
  */  
  set A(value) {
    if(!(value instanceof PolygonVertex)) { value = new PolygonVertex(value.x, value.y); }
    this._A = value;
    this._leftEndpoint = undefined;
    this._rightEndpoint = undefined;
  }

 /**
  * @type {Point}
  */ 
  get B() {
    return this._B;
  }

 /**
  * @type {Point}
  */ 
  set B(value) {
    if(!(value instanceof PolygonVertex)) { value = new PolygonVertex(value.x, value.y); }
    this._B = value;
    this._leftEndpoint = undefined;
    this._rightEndpoint = undefined;
  }
  
 /**
  * Compare function to sort by leftEndpoint.x, then leftEndpoint.y coordinates
  * @param {LightMaskPolygonEdge} a
  * @param {LightMaskPolygonEdge} b
  * @return {-1|0|1}
  */
  static compareXY_LeftEndpoints(a, b) {
    return compareXY(a.leftEndpoint, b.leftEndpoint);
  }

 /** 
  * Given an array of LightMaskPolygonEdges, identify intersections with this edge.
  * Update this intersectsWith Map and their respective intersectsWith Map accordingly.
  * Comparable to identifyWallIntersections method from WallsLayer Class
  * @param {LightMaskPolygonEdges[]} edges
  */
  identifyIntersections(edges) {
    edges.sort(LightMaskPolygonEdge.compareXY_LeftEndpoints);
  
    const ln = edges.length;
    // Record endpoints of this wall
    // Edges already have PolygonVertex endpoints, so pull the key
    const wallKeys = new Set([this.A.key, this.B.key]);
  
    // iterate over the other edge.walls
    for(let j = 0; j < ln; j += 1) {
      const other = edges[j];
    
      // if we have not yet reached the left end of this edge, we can skip
      if(other.rightEndpoint.x < this.leftEndpoint.x) continue;
    
      // if we reach the right end of this edge, we can skip the rest
      if(other.leftEndpoint.x > this.rightEndpoint.x) break;
    
      // Ignore edges that share an endpoint
      const otherKeys = new Set([other.A.key, other.B.key]);
      if ( wallKeys.intersects(otherKeys) ) continue;
    
      // Record any intersections
      if ( !foundry.utils.lineSegmentIntersects(this.A, this.B, other.A, other.B) ) continue;
    
      const x = foundry.utils.lineLineIntersection(this.A, this.B, other.A, other.B);
      if(!x) continue; // This eliminates co-linear lines
  
      this.intersectsWith.set(other.id, x);
      other.intersectsWith.set(this.id, x);
    }
  }
  
}

