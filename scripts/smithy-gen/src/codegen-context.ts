import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { camelCase, groupBy, upperFirst } from "lodash-es";
import type { Code, Import } from "ts-poet";
import { code, imp, joinCode } from "ts-poet";
import { generateBlobShapes } from "./generators/blob-shape-gen.js";
import { generateBooleanShapes } from "./generators/boolean-shape-gen.js";
import { generateDocumentShapes } from "./generators/document-shape-gen.js";
import { generateEnumShapes } from "./generators/enum-shape-gen.js";
import {
  buildConstraintChain as buildIntegerConstraintChain,
  generateIntegerShapes,
} from "./generators/integer-shape-gen.js";
import {
  buildConstraintChain as buildListConstraintChain,
  generateListShapes,
} from "./generators/list-shape-gen.js";
import { generateLongShapes } from "./generators/long-shape-gen.js";
import { generateMapShapes } from "./generators/map-shape-gen.js";
import { generateOperationShapes } from "./generators/operation-shape-gen.js";
import { generateServiceShapes } from "./generators/service-shape-gen.js";
import {
  buildConstraintChain as buildStringConstraintChain,
  generateStringShapes,
} from "./generators/string-shape-gen.js";
import { generateStructureShapes } from "./generators/structure-shape-gen.js";
import { generateTimestampShapes } from "./generators/timestamp-shape-gen.js";
import { generateUnionShapes } from "./generators/union-shape-gen.js";
import type { BlobShape } from "./shapes/blob-shape.js";
import type { BooleanShape } from "./shapes/boolean-shape.js";
import type { DocumentShape } from "./shapes/document-shape.js";
import type { EnumShape } from "./shapes/enum-shape.js";
import type { IntegerShape } from "./shapes/integer-shape.js";
import type { ListShape } from "./shapes/list-shape.js";
import type { LongShape } from "./shapes/long-shape.js";
import type { MapShape } from "./shapes/map-shape.js";
import type { OperationShape } from "./shapes/operation-shape.js";
import type { ServiceShape } from "./shapes/service-shape.js";
import type { StringShape } from "./shapes/string-shape.js";
import type { StructureShape } from "./shapes/structure-shape.js";
import type { TimestampShape } from "./shapes/timestamp-shape.js";
import type { SmithyAstModel } from "./smithy-ast-model.js";

type Shape = SmithyAstModel["shapes"][string];
type UnionShape = Extract<Shape, { type: "union" }>;
type ShapeType = SmithyAstModel["shapes"][string]["type"];
type TypeExpr = string | Import | Code;

export interface OperationMethodSignature {
  methodName: string;
  inputTypeExpr: TypeExpr;
  outputTypeExpr: TypeExpr;
  tsDoc?: string;
}

interface ShapeEntry<S extends Shape = Shape> {
  key: string;
  shape: S;
}

type OutputPaths = Record<string, string>;
type SchemaShapeType =
  | "blob"
  | "boolean"
  | "document"
  | "enum"
  | "integer"
  | "list"
  | "long"
  | "map"
  | "string"
  | "structure"
  | "timestamp"
  | "union";

interface RegisteredShapeSymbol {
  schemaName: string;
  fileKey: string;
}

interface ResolveSchemaReferenceOptions {
  currentShapeKey?: string;
  lazyForSameFile?: boolean;
  inline?: boolean;
  inlineStack?: Set<string>;
}

const zImp = imp("z@zod/v4");

function isStringCompatibleBuiltinTarget(target: string): boolean {
  return target === "smithy.api#String";
}

function isBlobShape(entry: ShapeEntry): entry is ShapeEntry<BlobShape> {
  return entry.shape.type === "blob";
}

function isBooleanShape(entry: ShapeEntry): entry is ShapeEntry<BooleanShape> {
  return entry.shape.type === "boolean";
}

function isIntegerShape(entry: ShapeEntry): entry is ShapeEntry<IntegerShape> {
  return entry.shape.type === "integer";
}

function isListShape(entry: ShapeEntry): entry is ShapeEntry<ListShape> {
  return entry.shape.type === "list";
}

function isMapShape(entry: ShapeEntry): entry is ShapeEntry<MapShape> {
  return entry.shape.type === "map";
}

function isStructureShape(
  entry: ShapeEntry,
): entry is ShapeEntry<StructureShape> {
  return entry.shape.type === "structure";
}

function isEnumShape(entry: ShapeEntry): entry is ShapeEntry<EnumShape> {
  return entry.shape.type === "enum";
}

function isDocumentShape(
  entry: ShapeEntry,
): entry is ShapeEntry<DocumentShape> {
  return entry.shape.type === "document";
}

function isLongShape(entry: ShapeEntry): entry is ShapeEntry<LongShape> {
  return entry.shape.type === "long";
}

function isStringShape(entry: ShapeEntry): entry is ShapeEntry<StringShape> {
  return entry.shape.type === "string";
}

function isTimestampShape(
  entry: ShapeEntry,
): entry is ShapeEntry<TimestampShape> {
  return entry.shape.type === "timestamp";
}

function isUnionShape(entry: ShapeEntry): entry is ShapeEntry<UnionShape> {
  return entry.shape.type === "union";
}

function isOperationShape(
  entry: ShapeEntry,
): entry is ShapeEntry<OperationShape> {
  return entry.shape.type === "operation";
}

function isServiceShape(entry: ShapeEntry): entry is ShapeEntry<ServiceShape> {
  return entry.shape.type === "service";
}

export class CodeGenContext {
  private model: SmithyAstModel;
  private shapeRegistry = new Map<string, RegisteredShapeSymbol>();
  private fileCode = new Map<string, Code[]>();
  private operationMethodRegistry = new Map<string, OperationMethodSignature>();

  constructor(model: SmithyAstModel) {
    this.model = model;
  }

  parseShapeKey(key: string): { namespace: string; name: string } {
    const hashIndex = key.indexOf("#");
    if (hashIndex === -1) {
      throw new Error(`Invalid shape key (missing #): ${key}`);
    }
    return {
      namespace: key.slice(0, hashIndex),
      name: key.slice(hashIndex + 1),
    };
  }

  getOutputFile(shapeKey: string): string {
    const { namespace } = this.parseShapeKey(shapeKey);
    const shapeType = this.getShapeType(shapeKey);
    const suffix =
      shapeType === "service"
        ? "service"
        : shapeType === "enum"
          ? "enums"
          : shapeType === "structure"
            ? "structures"
            : "schema";
    if (namespace === "com.amazonaws.s3") {
      return `s3-schemas:${suffix}`;
    }
    return `common-schemas:${namespace}:${suffix}`;
  }

  getImportPath(fileKey: string): string {
    if (fileKey.startsWith("s3-schemas:")) {
      return `./${fileKey.slice("s3-schemas:".length)}.js`;
    }
    if (fileKey.startsWith("common-schemas:")) {
      const rest = fileKey.slice("common-schemas:".length);
      const lastColon = rest.lastIndexOf(":");
      if (lastColon !== -1) {
        return `./${rest.slice(0, lastColon)}.${rest.slice(lastColon + 1)}.js`;
      }
      return `./${rest}.js`;
    }
    return `./${fileKey}.js`;
  }

  buildSchemaSymbol(shapeKey: string): RegisteredShapeSymbol {
    const { name } = this.parseShapeKey(shapeKey);
    return {
      schemaName: `${camelCase(name)}Schema`,
      fileKey: this.getOutputFile(shapeKey),
    };
  }

  registerDiscoveredShape(shapeKey: string): void {
    if (this.shapeRegistry.has(shapeKey)) {
      return;
    }
    this.shapeRegistry.set(shapeKey, this.buildSchemaSymbol(shapeKey));
  }

  registerDiscoveredShapes(shapeKeys: string[]): void {
    for (const shapeKey of shapeKeys) {
      this.registerDiscoveredShape(shapeKey);
    }
  }

  hasRegisteredShape(shapeKey: string): boolean {
    return this.shapeRegistry.has(shapeKey);
  }

  getRegisteredSchemaName(shapeKey: string): string | undefined {
    return this.shapeRegistry.get(shapeKey)?.schemaName;
  }

  resolveSchemaReference(
    targetShapeKey: string,
    fromFileKey: string,
    options?: ResolveSchemaReferenceOptions,
  ): { expr: TypeExpr; resolved: boolean; shapeType?: ShapeType } {
    if (options?.currentShapeKey === targetShapeKey) {
      return { expr: code`${zImp}.unknown()`, resolved: false };
    }

    const shouldInline = options?.inline ?? true;
    if (shouldInline) {
      const inlineResolution = this.resolveInlineShapeExpr(
        targetShapeKey,
        fromFileKey,
        options?.inlineStack ?? new Set<string>(),
      );
      if (inlineResolution) {
        return inlineResolution;
      }
    }

    return this.resolveSchemaSymbolReference(
      targetShapeKey,
      fromFileKey,
      options,
    );
  }

  private resolveSchemaSymbolReference(
    targetShapeKey: string,
    fromFileKey: string,
    options?: ResolveSchemaReferenceOptions,
  ): { expr: TypeExpr; resolved: boolean; shapeType?: ShapeType } {
    const registered = this.shapeRegistry.get(targetShapeKey);
    if (registered) {
      const shapeType = this.getShapeType(targetShapeKey);
      const isSameFile = registered.fileKey === fromFileKey;
      return {
        expr: isSameFile
          ? options?.lazyForSameFile
            ? code`${zImp}.lazy(() => ${registered.schemaName})`
            : registered.schemaName
          : imp(
              `${registered.schemaName}@${this.getImportPath(registered.fileKey)}`,
            ),
        resolved: true,
        ...(shapeType ? { shapeType } : {}),
      };
    }

    const builtin = this.resolveBuiltinShapeExpr(targetShapeKey);
    if (builtin) {
      return builtin;
    }

    return { expr: code`${zImp}.unknown()`, resolved: false };
  }

  private resolveInlineShapeExpr(
    targetShapeKey: string,
    fromFileKey: string,
    inlineStack: Set<string>,
  ): { expr: TypeExpr; resolved: boolean; shapeType?: ShapeType } | undefined {
    const builtin = this.resolveBuiltinShapeExpr(targetShapeKey);
    if (builtin) {
      return builtin;
    }

    const shape = this.model.shapes[targetShapeKey];
    if (!shape || inlineStack.has(targetShapeKey)) {
      return undefined;
    }

    inlineStack.add(targetShapeKey);

    const resolveNested = (
      nestedTargetShapeKey: string,
      currentShapeKey: string,
    ): { expr: TypeExpr; resolved: boolean; shapeType?: ShapeType } =>
      this.resolveSchemaReference(nestedTargetShapeKey, fromFileKey, {
        currentShapeKey,
        lazyForSameFile: true,
        inline: true,
        inlineStack,
      });

    try {
      switch (shape.type) {
        case "blob":
          return {
            expr: code`${zImp}.instanceof(Uint8Array)`,
            resolved: true,
            shapeType: "blob",
          };
        case "boolean":
          return {
            expr: code`${zImp}.boolean()`,
            resolved: true,
            shapeType: "boolean",
          };
        case "document":
          return {
            expr: code`${zImp}.unknown()`,
            resolved: true,
            shapeType: "document",
          };
        case "integer":
          return {
            expr: code`${zImp}.number()${buildIntegerConstraintChain(shape.traits)}`,
            resolved: true,
            shapeType: "integer",
          };
        case "long":
          return {
            expr: code`${zImp}.bigint()`,
            resolved: true,
            shapeType: "long",
          };
        case "string":
          return {
            expr: code`${zImp}.string()${buildStringConstraintChain(shape.traits)}`,
            resolved: true,
            shapeType: "string",
          };
        case "timestamp": {
          const timestampFormat = this.resolveTimestampFormatForFile(
            shape.traits?.["smithy.api#timestampFormat"],
            fromFileKey,
          );
          const schemaName =
            timestampFormat === "date-time"
              ? "rfc3339DateTimeTimestampSchema"
              : "imfFixdateTimestampSchema";
          const helperPath = fromFileKey.startsWith("common-schemas:")
            ? "../timestamp-schema-helpers.js"
            : "@raincity/aws-api-shared";
          return {
            expr: imp(`${schemaName}@${helperPath}`),
            resolved: true,
            shapeType: "timestamp",
          };
        }
        case "enum": {
          const { name } = this.parseShapeKey(targetShapeKey);
          const enumName = upperFirst(camelCase(name));
          const enumFileKey = this.getOutputFile(targetShapeKey);
          const enumExpr =
            enumFileKey === fromFileKey
              ? enumName
              : imp(`${enumName}@${this.getImportPath(enumFileKey)}`);
          return {
            expr: code`${zImp}.enum(${enumExpr})`,
            resolved: true,
            shapeType: "enum",
          };
        }
        case "list": {
          const memberResolution = resolveNested(
            shape.member.target,
            targetShapeKey,
          );
          const constraints = buildListConstraintChain(shape.traits);
          return {
            expr: code`${zImp}.array(${memberResolution.expr})${constraints}`,
            resolved: true,
            shapeType: "list",
          };
        }
        case "map": {
          const keyResolution = resolveNested(shape.key.target, targetShapeKey);
          const valueResolution = resolveNested(
            shape.value.target,
            targetShapeKey,
          );
          const keyExpr = !keyResolution.resolved
            ? code`${zImp}.string()`
            : keyResolution.shapeType !== undefined
              ? keyResolution.shapeType === "string" ||
                keyResolution.shapeType === "enum"
                ? keyResolution.expr
                : undefined
              : isStringCompatibleBuiltinTarget(shape.key.target)
                ? keyResolution.expr
                : undefined;
          if (!keyExpr) {
            return undefined;
          }
          return {
            expr: code`${zImp}.record(${keyExpr}, ${valueResolution.expr})`,
            resolved: true,
            shapeType: "map",
          };
        }
        case "union": {
          const unionMembers = Object.values(shape.members).map(
            (member) =>
              code`${resolveNested(member.target, targetShapeKey).expr}`,
          );
          return {
            expr: code`${zImp}.union([${joinCode(unionMembers, { on: ", " })}])`,
            resolved: true,
            shapeType: "union",
          };
        }
        default:
          return undefined;
      }
    } finally {
      inlineStack.delete(targetShapeKey);
    }
  }

  private resolveTimestampFormatForFile(
    format: "date-time" | "http-date" | undefined,
    fileKey: string,
  ): "date-time" | "http-date" {
    if (format) {
      return format;
    }

    if (
      fileKey.startsWith("s3-schemas:") ||
      fileKey.startsWith("common-schemas:")
    ) {
      return "date-time";
    }

    return "http-date";
  }

  getShapeType(
    shapeKey: string,
  ): SmithyAstModel["shapes"][string]["type"] | undefined {
    return this.model.shapes[shapeKey]?.type;
  }

  getShape(shapeKey: string): SmithyAstModel["shapes"][string] | undefined {
    return this.model.shapes[shapeKey];
  }

  addCode(fileKey: string, codeItem: Code): void {
    let codes = this.fileCode.get(fileKey);
    if (!codes) {
      codes = [];
      this.fileCode.set(fileKey, codes);
    }
    codes.push(codeItem);
  }

  registerOperationMethod(
    operationShapeKey: string,
    signature: OperationMethodSignature,
  ): void {
    this.operationMethodRegistry.set(operationShapeKey, signature);
  }

  getOperationMethod(
    operationShapeKey: string,
  ): OperationMethodSignature | undefined {
    return this.operationMethodRegistry.get(operationShapeKey);
  }

  generate(): void {
    const entries: ShapeEntry[] = Object.entries(this.model.shapes).map(
      ([key, shape]) => ({ key, shape }),
    );
    const grouped = groupBy(entries, (e) => e.shape.type);

    for (const entry of entries) {
      if (!this.isSchemaShapeType(entry.shape.type)) {
        continue;
      }
      this.registerDiscoveredShape(entry.key);
    }

    const blobShapes = (grouped["blob"] ?? []).filter(isBlobShape);
    generateBlobShapes(this, blobShapes);

    const booleanShapes = (grouped["boolean"] ?? []).filter(isBooleanShape);
    generateBooleanShapes(this, booleanShapes);

    const documentShapes = (grouped["document"] ?? []).filter(isDocumentShape);
    generateDocumentShapes(this, documentShapes);

    const enumShapes = (grouped["enum"] ?? []).filter(isEnumShape);
    generateEnumShapes(this, enumShapes);

    const integerShapes = (grouped["integer"] ?? []).filter(isIntegerShape);
    generateIntegerShapes(this, integerShapes);

    const longShapes = (grouped["long"] ?? []).filter(isLongShape);
    generateLongShapes(this, longShapes);

    const stringShapes = (grouped["string"] ?? []).filter(isStringShape);
    generateStringShapes(this, stringShapes);

    const timestampShapes = (grouped["timestamp"] ?? []).filter(
      isTimestampShape,
    );
    generateTimestampShapes(this, timestampShapes);

    const structureShapes = (grouped["structure"] ?? []).filter(
      isStructureShape,
    );
    generateStructureShapes(this, structureShapes);

    const listShapes = (grouped["list"] ?? []).filter(isListShape);
    generateListShapes(this, listShapes);

    const mapShapes = (grouped["map"] ?? []).filter(isMapShape);
    generateMapShapes(this, mapShapes);

    const unionShapes = (grouped["union"] ?? []).filter(isUnionShape);
    generateUnionShapes(this, unionShapes);

    const operationShapes = (grouped["operation"] ?? []).filter(
      isOperationShape,
    );
    generateOperationShapes(this, operationShapes);

    const serviceShapes = (grouped["service"] ?? []).filter(isServiceShape);
    generateServiceShapes(this, serviceShapes);
  }

  private isSchemaShapeType(
    shapeType: ShapeType,
  ): shapeType is SchemaShapeType {
    return (
      shapeType === "blob" ||
      shapeType === "boolean" ||
      shapeType === "document" ||
      shapeType === "enum" ||
      shapeType === "integer" ||
      shapeType === "list" ||
      shapeType === "long" ||
      shapeType === "map" ||
      shapeType === "string" ||
      shapeType === "structure" ||
      shapeType === "timestamp" ||
      shapeType === "union"
    );
  }

  private resolveBuiltinShapeExpr(
    targetShapeKey: string,
  ): { expr: TypeExpr; resolved: boolean; shapeType?: ShapeType } | undefined {
    switch (targetShapeKey) {
      case "smithy.api#String":
        return {
          expr: code`${zImp}.string()`,
          resolved: true,
          shapeType: "string",
        };
      case "smithy.api#Boolean":
        return {
          expr: code`${zImp}.boolean()`,
          resolved: true,
          shapeType: "boolean",
        };
      case "smithy.api#Integer":
        return {
          expr: code`${zImp}.number()`,
          resolved: true,
          shapeType: "integer",
        };
      case "smithy.api#Long":
        return {
          expr: code`${zImp}.bigint()`,
          resolved: true,
          shapeType: "long",
        };
      case "smithy.api#Blob":
        return {
          expr: code`${zImp}.instanceof(Uint8Array)`,
          resolved: true,
          shapeType: "blob",
        };
      case "smithy.api#Timestamp":
        return {
          expr: code`${zImp}.string()`,
          resolved: true,
          shapeType: "timestamp",
        };
      case "smithy.api#Document":
        return {
          expr: code`${zImp}.unknown()`,
          resolved: true,
          shapeType: "document",
        };
      case "smithy.api#Unit":
        return { expr: code`${zImp}.unknown()`, resolved: true };
      default:
        return undefined;
    }
  }

  renderFiles(): Map<string, string> {
    const rendered = new Map<string, string>();
    for (const [fileKey, codes] of this.fileCode) {
      const combined = joinCode(codes, { on: "\n\n" });
      const content = combined.toString({
        prefix: "// Auto-generated by smithy-gen. Do not edit.",
      });
      rendered.set(fileKey, content);
    }
    return rendered;
  }

  async writeFiles(outputPaths: OutputPaths): Promise<void> {
    const rendered = this.renderFiles();
    for (const [fileKey, content] of rendered) {
      const outputPath = outputPaths[fileKey];
      if (!outputPath) {
        throw new Error(`No output path configured for file key: ${fileKey}`);
      }

      // oxlint-disable-next-line no-await-in-loop
      await mkdir(dirname(outputPath), { recursive: true });
      // oxlint-disable-next-line no-await-in-loop
      await writeFile(outputPath, content);
    }
  }
}
