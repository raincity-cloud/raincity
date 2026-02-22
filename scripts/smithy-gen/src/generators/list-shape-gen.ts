import type { CodeGenContext } from "../codegen-context.js";
import type { ListShape } from "../shapes/list-shape.js";

interface ListShapeEntry {
  key: string;
  shape: ListShape;
}

export function buildConstraintChain(traits: ListShape["traits"]): string {
  if (!traits) return "";

  const parts: string[] = [];

  const length = traits["smithy.api#length"];
  if (length) {
    if (length.min !== undefined) {
      parts.push(`.min(${String(length.min)})`);
    }
    if (length.max !== undefined) {
      parts.push(`.max(${String(length.max)})`);
    }
  }

  if (traits["smithy.api#uniqueItems"] !== undefined) {
    parts.push(`.superRefine((items, refinementContext) => {
  const seen = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const serialized = JSON.stringify(items[index]);
    const key = serialized === undefined ? "__undefined__" : serialized;
    const previousIndex = seen.get(key);
    if (previousIndex !== undefined) {
      refinementContext.addIssue({
        code: "custom",
        message: "Duplicate items are not allowed.",
        path: [index],
      });
      return;
    }
    seen.set(key, index);
  }
})`);
  }

  return parts.join("");
}

export function generateListShapes(
  _ctx: CodeGenContext,
  _shapes: ListShapeEntry[],
): void {
  // List shapes are inlined at usage sites.
}
