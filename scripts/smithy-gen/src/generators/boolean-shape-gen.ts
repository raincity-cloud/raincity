import type { CodeGenContext } from "../codegen-context.js";
import type { BooleanShape } from "../shapes/boolean-shape.js";

interface BooleanShapeEntry {
  key: string;
  shape: BooleanShape;
}

export function generateBooleanShapes(
  _ctx: CodeGenContext,
  _shapes: BooleanShapeEntry[],
): void {
  // Boolean shapes are inlined at usage sites.
}
