const BASE_WIDTH = 375; // baseline

export const FRAME_WIDTH = 375; // fixed design width
export const FRAME_HEIGHT = 812; // fixed design height

export function scaleByWidth(value) {
  // Always scale relative to the fixed frame width
  const ratio = FRAME_WIDTH / BASE_WIDTH;
  return Math.round(Number(value) * ratio);
}

export function FaktorelGenislik(value) {
  return scaleByWidth(Number(value));
}

export const HeaderHeight = 56; // base header height for web


