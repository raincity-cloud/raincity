import type { CodeGenContext } from "../codegen-context.js";
import type { LongShape } from "../shapes/long-shape.js";

interface LongShapeEntry {
  key: string;
  shape: LongShape;
}

export function generateLongShapes(
  _ctx: CodeGenContext,
  _shapes: LongShapeEntry[],
): void {
  // Long shapes are inlined at usage sites.
}
