import { camelCase } from "lodash-es";
import { code, def, imp, joinCode } from "ts-poet";
import type { CodeGenContext } from "../codegen-context.js";
import type { StructureShape } from "../shapes/structure-shape.js";
import type { SmithyAstModel } from "../smithy-ast-model.js";
import { buildSchemaDocumentationComment } from "./schema-documentation-comment.js";
import { buildSchemaTraitTodoComments } from "./schema-trait-todo-comment.js";

const zImp = imp("z@zod/v4");

interface StructureShapeEntry {
  key: string;
  shape: StructureShape;
}

type ShapeType = SmithyAstModel["shapes"][string]["type"];
type StructureMember = NonNullable<StructureShape["members"][string]>;
type StructureMemberTraits = StructureMember["traits"];
type NumericConstraintTrait = NonNullable<
  NonNullable<StructureMemberTraits>["smithy.api#length"]
>;

const implementedShapeTraitKeys = new Set<string>(["smithy.api#documentation"]);
const implementedMemberTraitKeys = new Set<string>([
  "smithy.api#default",
  "smithy.api#documentation",
  "smithy.api#length",
  "smithy.api#range",
  "smithy.api#required",
]);

function buildObjectPropertyName(memberName: string): string {
  if (/^[$A-Z_a-z][$\w]*$/u.test(memberName)) {
    return memberName;
  }
  return JSON.stringify(memberName);
}

function indentBlock(block: string, indent: string): string {
  return block
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function encodeDefaultBlob(value: string): string {
  const bytes = Array.from(Buffer.from(value, "base64"));
  return bytes.length > 0
    ? `new Uint8Array([${bytes.join(", ")}])`
    : "new Uint8Array([])";
}

function buildDefaultExpression(
  defaultValue: string | boolean,
  targetShapeType: ShapeType,
  memberLocation: string,
): string {
  if (targetShapeType === "blob") {
    if (typeof defaultValue !== "string") {
      throw new Error(
        `Unsupported smithy.api#default value on ${memberLocation}: blob targets require a base64 string default.`,
      );
    }
    return encodeDefaultBlob(defaultValue);
  }

  if (targetShapeType === "boolean") {
    if (typeof defaultValue !== "boolean") {
      throw new Error(
        `Unsupported smithy.api#default value on ${memberLocation}: boolean targets require a boolean default.`,
      );
    }
    return String(defaultValue);
  }

  if (
    targetShapeType === "string" ||
    targetShapeType === "enum" ||
    targetShapeType === "timestamp"
  ) {
    if (typeof defaultValue !== "string") {
      throw new Error(
        `Unsupported smithy.api#default value on ${memberLocation}: ${targetShapeType} targets require a string default.`,
      );
    }
    return JSON.stringify(defaultValue);
  }

  if (targetShapeType === "document") {
    return JSON.stringify(defaultValue);
  }

  throw new Error(
    `Unsupported smithy.api#default target type "${targetShapeType}" on ${memberLocation}.`,
  );
}

export function buildMemberConstraintChain(
  traits: StructureMemberTraits,
  options?: {
    applyDefault?: boolean;
    applyLength?: boolean;
    applyRange?: boolean;
    memberLocation?: string;
    targetShapeType?: ShapeType | undefined;
  },
): string {
  const parts: string[] = [];
  const isRequired = traits?.["smithy.api#required"] !== undefined;
  const applyDefault = options?.applyDefault ?? true;
  const applyLength = options?.applyLength ?? true;
  const applyRange = options?.applyRange ?? true;

  if (applyLength) {
    const length: NumericConstraintTrait | undefined =
      traits?.["smithy.api#length"];
    if (length) {
      if (length.min !== undefined) {
        parts.push(`.superRefine((value, refinementContext) => {
  const valueWithLength = value as { length?: number } | null | undefined;
  const currentLength = valueWithLength?.length;
  if (typeof currentLength === "number" && currentLength < ${String(length.min)}) {
    refinementContext.addIssue({
      code: "too_small",
      minimum: ${String(length.min)},
      inclusive: true,
      origin: "array",
      path: [],
    });
  }
})`);
      }
      if (length.max !== undefined) {
        parts.push(`.superRefine((value, refinementContext) => {
  const valueWithLength = value as { length?: number } | null | undefined;
  const currentLength = valueWithLength?.length;
  if (typeof currentLength === "number" && currentLength > ${String(length.max)}) {
    refinementContext.addIssue({
      code: "too_big",
      maximum: ${String(length.max)},
      inclusive: true,
      origin: "array",
      path: [],
    });
  }
})`);
      }
    }
  }

  if (applyRange) {
    const range: NumericConstraintTrait | undefined =
      traits?.["smithy.api#range"];
    if (range) {
      if (range.min !== undefined) {
        parts.push(`.superRefine((value, refinementContext) => {
  if (typeof value === "number" && value < ${String(range.min)}) {
    refinementContext.addIssue({
      code: "too_small",
      minimum: ${String(range.min)},
      inclusive: true,
      origin: "number",
      path: [],
    });
  }
})`);
      }
      if (range.max !== undefined) {
        parts.push(`.superRefine((value, refinementContext) => {
  if (typeof value === "number" && value > ${String(range.max)}) {
    refinementContext.addIssue({
      code: "too_big",
      maximum: ${String(range.max)},
      inclusive: true,
      origin: "number",
      path: [],
    });
  }
})`);
      }
    }
  }

  if (!isRequired) {
    parts.push(".optional()");
  }

  const defaultValue = traits?.["smithy.api#default"];
  if (applyDefault && defaultValue !== undefined) {
    const targetShapeType = options?.targetShapeType;
    if (!targetShapeType) {
      const location = options?.memberLocation ?? "structure member";
      throw new Error(
        `Cannot apply smithy.api#default on ${location}: missing target shape type.`,
      );
    }
    const location = options?.memberLocation ?? "structure member";
    const defaultExpression = buildDefaultExpression(
      defaultValue,
      targetShapeType,
      location,
    );
    parts.push(`.default(${defaultExpression})`);
  }

  return parts.join("");
}

export function generateStructureShapes(
  ctx: CodeGenContext,
  shapes: StructureShapeEntry[],
): void {
  for (const { key, shape } of shapes) {
    const { name } = ctx.parseShapeKey(key);
    const fileKey = ctx.getOutputFile(key);
    const schemaName = `${camelCase(name)}Schema`;

    const shapeCommentLines: string[] = [];
    const shapeDocumentation = buildSchemaDocumentationComment(
      shape.traits?.["smithy.api#documentation"],
    );
    if (shapeDocumentation) {
      shapeCommentLines.push(shapeDocumentation);
    }
    shapeCommentLines.push(
      ...buildSchemaTraitTodoComments(
        shape.traits,
        implementedShapeTraitKeys,
        `structure ${name}`,
      ),
    );
    const shapeCommentPrefix =
      shapeCommentLines.length > 0 ? `${shapeCommentLines.join("\n")}\n` : "";

    const memberEntries: Array<ReturnType<typeof code>> = [];
    for (const [memberName, member] of Object.entries(shape.members)) {
      if (!member) {
        continue;
      }

      const memberComments: string[] = [];
      const memberDocumentation = buildSchemaDocumentationComment(
        member.traits?.["smithy.api#documentation"],
      );
      if (memberDocumentation) {
        memberComments.push(indentBlock(memberDocumentation, "  "));
      }

      memberComments.push(
        ...buildSchemaTraitTodoComments(
          member.traits,
          implementedMemberTraitKeys,
          `structure member ${name}.${memberName}`,
        ).map((line) => `  ${line}`),
      );

      const memberTarget = member.target;
      let hasResolvedTarget = false;
      let memberTargetShapeType: ShapeType | undefined;
      let memberSchemaExpr:
        | string
        | ReturnType<typeof imp>
        | ReturnType<typeof code> = code`${zImp}.unknown()`;
      if (ctx.hasRegisteredShape(memberTarget)) {
        hasResolvedTarget = true;
        memberTargetShapeType = ctx.getShapeType(memberTarget);
        const { name: memberTargetName } = ctx.parseShapeKey(memberTarget);
        const memberTargetSchemaName = `${camelCase(memberTargetName)}Schema`;
        const memberTargetFileKey = ctx.getOutputFile(memberTarget);
        memberSchemaExpr =
          memberTargetFileKey === fileKey
            ? memberTargetSchemaName
            : imp(`${memberTargetSchemaName}@./${memberTargetFileKey}`);
      } else {
        memberComments.push(
          `  // TODO: structure member target ${memberTarget} for ${name}.${memberName} is not generated yet.`,
        );
      }

      const memberCommentPrefix =
        memberComments.length > 0 ? `${memberComments.join("\n")}\n` : "";
      const memberConstraints = buildMemberConstraintChain(member.traits, {
        applyDefault: hasResolvedTarget,
        applyLength: hasResolvedTarget,
        applyRange: hasResolvedTarget,
        memberLocation: `structure member ${name}.${memberName}`,
        targetShapeType: memberTargetShapeType,
      });
      memberEntries.push(
        code`${memberCommentPrefix}  ${buildObjectPropertyName(memberName)}: ${memberSchemaExpr}${memberConstraints},`,
      );
    }

    const schemaCode =
      memberEntries.length > 0
        ? code`${shapeCommentPrefix}export const ${def(schemaName)} = ${zImp}.object({
${joinCode(memberEntries, { on: "\n" })}
});`
        : code`${shapeCommentPrefix}export const ${def(schemaName)} = ${zImp}.object({});`;

    ctx.addCode(fileKey, schemaCode);
    ctx.registerShape(key, imp(`${schemaName}@./${fileKey}`));
  }
}
