import type { CodeGenContext } from "../codegen-context.js";
import type { BlobShape } from "../shapes/blob-shape.js";

interface BlobShapeEntry {
  key: string;
  shape: BlobShape;
}

export function generateBlobShapes(
  _ctx: CodeGenContext,
  _shapes: BlobShapeEntry[],
): void {
  // Blob shapes are inlined at usage sites.
}
