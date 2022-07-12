// Constants used in this module

"use strict";

export const MODULE_ID = "lightmask";

export const KEYS = {
  SHAPE: "shape",
  SIDES: "sides",
  CUSTOM_WALLS: {
    IDS: "customWallIDs",
    EDGES: "customEdges",
    BUTTON: "customWallIDsButton"
  },
  ELLIPSE: { MINOR: "ellipseMinor", MAJOR: "ellipseMajor" },
  ROTATION: "rotation",
  RELATIVE: "relative",
  ORIGIN: "origin"
};

export const TEMPLATES = {
  LIGHT: `modules/${MODULE_ID}/templates/lightmask-ambient-light-config.html`,
  SOUND: `modules/${MODULE_ID}/templates/lightmask-ambient-sound-config.html`,
  TOKEN: `modules/${MODULE_ID}/templates/lightmask-token-light-config.html`
}

export const HTML_INJECTION = {
  LIGHT: "div[data-tab='advanced']:last",
  SOUND: ".form-group:last",
  TOKEN: "div[data-group='light']:last"
}
