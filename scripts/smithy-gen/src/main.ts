import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CodeGenContext } from "./codegen-context.js";
import { smithyAstModelSchema } from "./smithy-ast-model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const smithyAstModelPath = join(
  __dirname,
  "..",
  "..",
  "..",
  "vendor",
  "aws-model.json",
);

const s3OutputPath = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "s3",
  "src",
  "generated",
  "schema.ts",
);
const sharedOutputPath = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "aws-api-shared",
  "src",
  "generated",
  "schema.ts",
);

const fileContent = await readFile(smithyAstModelPath, "utf-8");
const smithyAstModel = smithyAstModelSchema.parse(JSON.parse(fileContent));

const ctx = new CodeGenContext(smithyAstModel);
ctx.generate();
await ctx.writeFiles({
  "s3-schemas": s3OutputPath,
  "common-schemas": sharedOutputPath,
});

console.log("Code generation complete.");
