import type { CodeGenContext } from "../codegen-context.js";
import type { TimestampShape } from "../shapes/timestamp-shape.js";

interface TimestampShapeEntry {
  key: string;
  shape: TimestampShape;
}

export function generateTimestampShapes(
  _ctx: CodeGenContext,
  _shapes: TimestampShapeEntry[],
): void {
  // Timestamp shapes are inlined at usage sites.
}
