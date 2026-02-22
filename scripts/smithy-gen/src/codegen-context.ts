import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { groupBy } from "lodash-es";
import type { Code, Import } from "ts-poet";
import { joinCode } from "ts-poet";
import { generateBlobShapes } from "./generators/blob-shape-gen.js";
import { generateBooleanShapes } from "./generators/boolean-shape-gen.js";
import { generateDocumentShapes } from "./generators/document-shape-gen.js";
import { generateEnumShapes } from "./generators/enum-shape-gen.js";
import { generateIntegerShapes } from "./generators/integer-shape-gen.js";
import { generateListShapes } from "./generators/list-shape-gen.js";
import { generateLongShapes } from "./generators/long-shape-gen.js";
import { generateMapShapes } from "./generators/map-shape-gen.js";
import { generateStringShapes } from "./generators/string-shape-gen.js";
import { generateStructureShapes } from "./generators/structure-shape-gen.js";
import { generateTimestampShapes } from "./generators/timestamp-shape-gen.js";
import type { BlobShape } from "./shapes/blob-shape.js";
import type { BooleanShape } from "./shapes/boolean-shape.js";
import type { DocumentShape } from "./shapes/document-shape.js";
import type { EnumShape } from "./shapes/enum-shape.js";
import type { IntegerShape } from "./shapes/integer-shape.js";
import type { ListShape } from "./shapes/list-shape.js";
import type { LongShape } from "./shapes/long-shape.js";
import type { MapShape } from "./shapes/map-shape.js";
import type { StringShape } from "./shapes/string-shape.js";
import type { StructureShape } from "./shapes/structure-shape.js";
import type { TimestampShape } from "./shapes/timestamp-shape.js";
import type { SmithyAstModel } from "./smithy-ast-model.js";

type Shape = SmithyAstModel["shapes"][string];

interface ShapeEntry<S extends Shape = Shape> {
  key: string;
  shape: S;
}

type OutputPaths = Record<string, string>;

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

export class CodeGenContext {
  private model: SmithyAstModel;
  private shapeRegistry = new Map<string, Import>();
  private fileCode = new Map<string, Code[]>();

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
    if (namespace === "com.amazonaws.s3") {
      return "s3-schemas";
    }
    return `common-schemas:${namespace}`;
  }

  registerShape(shapeKey: string, symbol: Import): void {
    this.shapeRegistry.set(shapeKey, symbol);
  }

  hasRegisteredShape(shapeKey: string): boolean {
    return this.shapeRegistry.has(shapeKey);
  }

  getShapeType(
    shapeKey: string,
  ): SmithyAstModel["shapes"][string]["type"] | undefined {
    return this.model.shapes[shapeKey]?.type;
  }

  addCode(fileKey: string, codeItem: Code): void {
    let codes = this.fileCode.get(fileKey);
    if (!codes) {
      codes = [];
      this.fileCode.set(fileKey, codes);
    }
    codes.push(codeItem);
  }

  generate(): void {
    const entries: ShapeEntry[] = Object.entries(this.model.shapes).map(
      ([key, shape]) => ({ key, shape }),
    );
    const grouped = groupBy(entries, (e) => e.shape.type);

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
  }

  renderFiles(): Map<string, string> {
    const rendered = new Map<string, string>();
    for (const [fileKey, codes] of this.fileCode) {
      const combined = joinCode(codes, { on: "\n" });
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
