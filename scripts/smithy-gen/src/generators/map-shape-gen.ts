import type { CodeGenContext } from "../codegen-context.js";
import type { MapShape } from "../shapes/map-shape.js";

interface MapShapeEntry {
  key: string;
  shape: MapShape;
}

export function generateMapShapes(
  _ctx: CodeGenContext,
  _shapes: MapShapeEntry[],
): void {
  // Map shapes are inlined at usage sites.
}
