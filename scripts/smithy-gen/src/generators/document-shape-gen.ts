import type { CodeGenContext } from "../codegen-context.js";
import type { DocumentShape } from "../shapes/document-shape.js";

interface DocumentShapeEntry {
  key: string;
  shape: DocumentShape;
}

export function generateDocumentShapes(
  _ctx: CodeGenContext,
  _shapes: DocumentShapeEntry[],
): void {
  // Document shapes are inlined at usage sites.
}
