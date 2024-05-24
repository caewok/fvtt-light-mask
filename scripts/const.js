// Constants used in this module

"use strict";

export const MODULE_ID = "lightmask";

export const FLAGS = {
  SHAPE: "shape",
  SIDES: "sides",
  POINTS: "points",
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
  TOKEN: `modules/${MODULE_ID}/templates/lightmask-token-light-config.html`,
  SOUND_BODY: `modules/${MODULE_ID}/templates/lightmask-ambient-sound-body-config.html`
};

// Icons displayed in config tabs.
export const ICONS = {
  MODULE: "fa-solid fa-mask",
  SOUND: "fa-solid fa-music"
};

export const HTML_INJECTION = {
  LIGHT: "div[data-tab='advanced']:last",
  SOUND: ".form-group:last",
  TOKEN: "div[data-group='light']:last"
};

export const SHAPE = {
  TYPES: {
    CIRCLE: "circle",
    ELLIPSE: "ellipse",
    POLYGON: "polygon",
    STAR: "star",
    NONE: "none"
  },

  LABELS: {
    circle: "lightmask.Circle",
    ellipse: "lightmask.Ellipse",
    polygon: "lightmask.RegularPolygon",
    star: "lightmask.RegularStar",
    none: "lightmask.None"
  },

  TYPESET: new Set("circle", "ellipse", "polygon", "star", "none")
};

SHAPE.TYPESET = new Set(Object.values(SHAPE.TYPES));

// Ids for the submenu blocks for configuring shapes.
export const CONFIG_BLOCK_IDS = {
  POLYGON: "lightmask-config-polygon-sides",
  ELLIPSE: "lightmask-config-ellipse-minor",
  STAR: "lightmask-config-star-points"
};
