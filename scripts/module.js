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
