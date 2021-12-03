/* globals
canvas,
foundry,
ui,
AmbientSoundConfig,
renderTemplate
*/

'use strict';

import { MODULE_ID, CUSTOM_IDS_KEY } from "./const.js";
import { log } from "./module.js";


/**
 * Inject html to add controls to the ambient light configuration:
 * 1. Drop-down to select different shapes as the radius border.
 * 2. Text box so user can add comma-separated list of wall ids to use as custom edges.
 * 3. Button so user can automatically add controlled walls as the custom edges.
 *
 * templates/scene/ambient-light-config.html
 * follows approach in https://github.com/erithtotl/wall-height/blob/master/scripts/wall-height.js
 */
export async function lightMaskRenderAmbientLightConfig(app, html, data) {
  const is_sound = Boolean(app instanceof AmbientSoundConfig);

  log(`Hooking ${is_sound ? "renderAmbientSoundConfig!" : "renderAmbientLightConfig!"}`, app, html, data);
  
//   const moduleLabel = `Light Mask`;  
//   const shapeLabel = `Shape`;  
//   const idLabel = `Custom cached wall IDs`;
//   const idButtonLabel = `Cache selected walls`;
  
  
  
  // cannot get the following to work---should be possible to use 
  // handlebars {{selectOptions}} to populate the drop-down menu.
  /*
  data.lightMaskShapes = { 
    circle: "Circle", 
    triangle: "Triangle",
    square: "Square",
    hexagon: "Hexagon",
    custom: "Custom"
  }
  */
  
  // insert in the advanced tab after the last group
  // advanced tab is last tab
  /*
  html.find(".form-group").last().after(`
  <fieldset>
    <legend>${moduleLabel}</legend>
      <div class="form-group">
        <label for="${moduleScope}.shapes">${shapeLabel}</label>
        <select id="${moduleScope}.shapes" name="flags.${moduleScope}.${SHAPE_KEY}">
          {{selectOptions lightMaskShapes selected=data.flags.${moduleScope}.${SHAPE_KEY} }}
        </select>  
      </div>
          
      <div class="form-group">
        <label>${idLabel}</label>
        <input name=flags.${moduleScope}.${WALL_ID_KEY}" type="text" data-dtype="text" value=${ids}>
      </div>
    </legend>
  </fieldset>
  `);
  */
  
//   const current_shape = data.data.flags?.[MODULE_ID]?.[SHAPE_KEY] || "circle";
//   log(`Current shape is ${current_shape}.`);
//   
//   const current_custom = data.data.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY] || '';
//   log(`Current custom is ${current_custom}.`);
  
  
  
  // From ambient light config template (doesn't work here):
  /*
  const sound_rotation_html = `
    <div class="form-group">
      <label>{{localize "LIGHT.Rotation" }} <span class="units">({{localize "Degrees"}})</span></label>
        <div class="form-fields">
          {{rangePicker name="rotation" value=data.rotation min="0" max="360"}}
        </div>
      <p class="hint">{{ localize 'LIGHT.AngleHint' }}</p>
    </div>
  `;
  */
//   
//   let sound_rotation_html = ``;
//   if(is_sound) {
//     const rotationLabel = `Rotation Angle <span class="units">(Degrees)</span>`;
//     const current_rotation = data.data.flags?.[MODULE_ID]?.[ROTATION_KEY] || 0;
//     log(`Current rotation is ${current_rotation}`)
//   
//     sound_rotation_html = `
//       <div class="form-group">
//           <label>${rotationLabel}</label>
//           <input name="flags.${MODULE_ID}.${ROTATION_KEY}" type="range" min="0" max="360" step="1" value=${current_rotation}>
//       </div>
//     `  
// 
//     log(`sound rotation html: \n${sound_rotation_html}`);
//   }

 data.shapes = { 
    circle: "lightmask.Circle", 
    triangle: "lightmask.Triangle",
    square: "lightmask.Square",
    pentagon: "lightmask.Pentagon",
    pentagram: "lightmask.Pentagram",
    hexagon: "lightmask.Hexagon",
    hexagram: "lightmask.Hexagram",
    none: "lightmask.None"
  }

 const template = is_sound ? 
                  `modules/${MODULE_ID}/templates/light-mask-ambient-sound-config.html` :
                  `modules/${MODULE_ID}/templates/light-mask-ambient-light-config.html`;
 const myHTML = await renderTemplate(template, data)
 
 log(`config rendered HTML`, myHTML);
 
 html.find(".form-group").last().after(myHTML);
  
 //  html.find(".form-group").last().after(`
//   <fieldset>
//     <legend>${moduleLabel}</legend>
//       ${sound_rotation_html}
//     
//       <div class="form-group">
//         <label for="${MODULE_ID}.shapes">${shapeLabel}</label>
//         <select id="${MODULE_ID}.shapes" name="flags.${MODULE_ID}.${SHAPE_KEY}">
//           <option value="circle" ${current_shape === "circle" ? "selected" : ""}>Circle</option>
//           <option value="triangle" ${current_shape === "triangle" ? "selected" : ""}>Triangle</option>
//           <option value="square" ${current_shape === "square" ? "selected" : ""}>Square</option>
//           <option value="pentagon" ${current_shape === "pentagon" ? "selected" : ""}>Pentagon</option>
//           <option value="pentagram" ${current_shape === "pentagram" ? "selected" : ""}>Pentagram</option>
//           <option value="hexagon" ${current_shape === "hexagon" ? "selected" : ""}>Hexagon</option>
//           <option value="hexagram" ${current_shape === "hexagram" ? "selected" : ""}>Hexagram</option>
//           <option value="none" ${current_shape === "none" ? "selected" : ""}>None</option>
//         </select>  
//       </div>
//           
//       <div class="form-group">
//         <label>${idLabel}</label>
//         <input name="flags.${MODULE_ID}.${CUSTOM_IDS_KEY}" type="text" data-dtype="text" value=${current_custom}>
//       </div>
//       
//       <div class="form-group">
//         <label>${idButtonLabel}</label>
//         <button type="button" class="saveWallsButton" title=${idButtonLabel}>${idButtonLabel}</button>
//       </div>  
//      
//     </legend>
//   </fieldset>
//   `); 
    
  // to find the data, get a light.
  // l = [...canvas.lighting.sources][0]
  // l.object.data.flags.lightmask
  // or canvas.lighting.objects[0]

}

/**
 * Add a method to the AmbientLightConfiguration to handle when user 
 * clicks the button to add custom wall ids.
 * @param {PointerEvent} event    The originating click event
 */
export async function lightMaskOnAddWallIDs(event) {
  log(`lightMaskOnAddWallIDs`, event);
  
  const ids_to_add = controlledWallIDs();
  if(!ids_to_add) return;
  log(`Ids to add: ${ids_to_add}`);
  
  // somehow change the data and refresh...
  
  
  const newData = {};
  newData[`flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`] = ids_to_add;
  const previewData = this._getSubmitData(newData);
  log(`previewData`, previewData);
  
  foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});
  
  this.render();
  //this._refresh();
}

/** 
 * Wrap activateListeners to catch when user clicks the button to add custom wall ids.
 */
export function lightMaskActivateListeners(wrapped, html) {
  log(`lightMaskActivateListeners`, html, this);
  
  // this makes the config panel close but does not call _onAddWallIDs:
  // html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //const saveWallsButton = html.find("button[id='saveWallsButton']");
  //saveWallsButton.on("click", event => this._onAddWallIDs(event, html));
  
  wrapped(html);  
  log(`lightMaskActivateListeners after`, html);
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //html.find('button[id="saveWallsButton"]').click(this._onAddWallIDs.bind(this));
  
  // this makes the config panel close but does not call _onAddWallIDs:
  //const saveWallsButton = html.find("button[id='saveWallsButton']");
  //saveWallsButton.on("click", event => this._onAddWallIDs(event, html));
  
  //saveWallsButton.on("click", event => { log(`saveWallsButton clicked!`, event) })  
  
  // works!
//   html.on('click', '.saveWallsButton', (event) => {
//     log(`saveWallsButton clicked!`, event);
//   });
   html.on('click', '.saveWallsButton', this._onAddWallIDs.bind(this));
}

/**
 * Retrieve a comma-separated list of wall ids currently controlled on the canvas.
 * @return {string}
 */
export function controlledWallIDs() {
  const walls = canvas.walls.controlled;
  if(walls.length === 0) {
    console.warn("Please select one or more walls on the canvas.");
    ui.notifications.warn("Please select one or more walls on the canvas.")
    return;
  }
  
  const id = walls.map(w => w.id);
  return id.join(",");
}