/* globals
libWrapper
*/

`use strict`;

// Patches

import { lightMaskInitializeLightSource } from "./initializeLightSource.js";
import { MODULE_ID } from "./const.js";

export function registerLightMask() {
  libWrapper.register(MODULE_ID, 'LightSource.prototype.initialize', lightMaskInitializeLightSource, 'MIXED');
}