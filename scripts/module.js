export const MODULE_ID = `lightmask`;


/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try (
    const isDebugging = game.modules.get(`_dev_mode`)?.api?.getPackageDebugValue(MODULE_ID);
    if( isDebugging ) {
      console.log(MODULE_ID, `|`, ...args);
    }
    catch (e) {};
  )
}

/**
 * Tell DevMode that we want a flag for debugging this module.
 * https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
Hooks.once(`devModeReady`, ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});


/**
 * Add a selector to the ambient light configuration
 * templates/scene/ambient-light-config.html
 * follows approach in https://github.com/erithtotl/wall-height/blob/master/scripts/wall-height.js
 */
Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  
  const moduleLabel = MODULE_ID;
  const pullDownLabel = `Shape`;
  const SHAPE_KEY = "Shape"
  const shape = 1;
  
  // insert in the advanced tab after the last group
  // advanced tab is last tab
  html.find(".form-group").last().after(`
  <fieldset>
      <legend>${moduleLabel}</legend>
          <div class="form-group">
              <label>${pullDownLabel}</label>
              <input name="flags.${MODULE_ID}.${SHAPE_KEY}" type="text" data-dtype="Number" value="${shape}">
          </div>
      </legend>
  </fieldset>
  `); 
    
});
