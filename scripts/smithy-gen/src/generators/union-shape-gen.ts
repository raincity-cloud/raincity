import type { CodeGenContext } from "../codegen-context.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";

interface UnionShapeEntry {
  key: string;
  shape: UnionShape;
}

type UnionShape = Extract<SmithyAstModel["shapes"][string], { type: "union" }>;
export function generateUnionShapes(
  _ctx: CodeGenContext,
  _shapes: UnionShapeEntry[],
): void {
  // Union shapes are inlined at usage sites.
}
