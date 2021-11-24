/* globals

*/

'use strict';

import { MODULE_ID, SHAPE_KEY, CUSTOM_IDS_KEY, CUSTOM_EDGES_KEY } from "./const.js";
import { log } from "./module.js";

// Hook preUpdateAmbientLight


/**
 * Hook for preUpdateAmbientLight
 * @param {AmbientLightDocument} doc
 * @param {Object} data
 * @param {Object} options {diff: true, render: true}
 * @param {string} id
 */
export function lightMaskPreUpdateAmbientLight(doc, new_data, options, id) {
  log(`Hooking preUpdateAmbientLight ${id}!`, doc, new_data, options);
  
  // data._id should point to light
   
  if(!new_data?.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY]) return;
  
  const custom_ids = new_data.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY] || "";
  let edges_cache = doc.data.flags?.[MODULE_ID]?.[CUSTOM_EDGES_KEY] || [];
  
  log(`preUpdateAmbientLight ids are ${custom_ids} with cache size ${edges_cache.length}.`);
  edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, custom_ids)
  
  const updateObj = { flags: { [MODULE_ID]: { [CUSTOM_EDGES_KEY]: edges_cache }}};
    
  log(`preUpdateAmbientLight updating cache size ${edges_cache.length}`, edges_cache, updateObj);
  
  doc.data.update(updateObj);
}

function lightMaskUpdateCustomEdgeCache(edges_cache, custom_ids) {
   if(!custom_ids || custom_ids === "") {
    // no custom ids, clear existing mapping
    edges_cache = [];
    
  } else {
    const parsed_ids = new Set(custom_ids.split(","));
    const cached_ids = new Set(edges_cache.map(e => e.id));
    
    const new_ids = parsed_ids.diff(cached_ids);
    new_ids.forEach(id => {
      // try to locate the wall on the canvas 
      const wall = canvas.walls.placeables.find(w => w.id === id);
      if(!wall) {
        log(`wall ${id} not found.`);
        return;
      }
      
      log(`Adding wall ${wall.id} to cache.`);
      
      // store limited wall data. This will include c (coordinates) as well as types.
      edges_cache.push(
      {
        c: wall.data.c, 
        light: wall.data.light, 
        move: wall.data.move, 
        sight: wall.data.sight,
        sound: wall.data.sound,
        id: id 
      });
    });
    
    const removed_ids = cached_ids.diff(parsed_ids);
    edges_cache = edges_cache.filter(e => {
      if(removed_ids.has(e.id)) { log(`Removing ${e.id} from cache.`); }
      return !removed_ids.has(e.id);
    });
  } 
  
  return edges_cache; 
}

/**
 * Difference (a \ b): create a set that contains those elements of 
 * set a that are not in set b.
 */
Set.prototype.diff = function(b) {
  return new Set([...this].filter(x => !b.has(x)));
}