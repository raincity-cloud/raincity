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
const sharedOutputDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "aws-api-shared",
  "src",
  "generated",
);

const fileContent = await readFile(smithyAstModelPath, "utf-8");
const smithyAstModel = smithyAstModelSchema.parse(JSON.parse(fileContent));

const ctx = new CodeGenContext(smithyAstModel);
ctx.generate();
const outputPaths: Record<string, string> = {
  "s3-schemas": s3OutputPath,
};
for (const fileKey of ctx.renderFiles().keys()) {
  if (!fileKey.startsWith("common-schemas:")) {
    continue;
  }
  const namespace = fileKey.slice("common-schemas:".length);
  outputPaths[fileKey] = join(sharedOutputDirectory, `${namespace}.ts`);
}
await ctx.writeFiles(outputPaths);

console.log("Code generation complete.");
