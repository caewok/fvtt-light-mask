/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the LightSource class
export const PATCHES = {};
PATCHES.BASIC = {};

import { boundaryPolygon, _getPolygonConfiguration } from "./boundaryPolygon.js";

// ----- NOTE: Methods ----- //

PATCHES.BASIC.METHODS = { boundaryPolygon };

// ----- NOTE: Wrappers ----- //

PATCHES.BASIC.WRAPS = { _getPolygonConfiguration };
