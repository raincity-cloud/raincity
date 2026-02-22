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

const s3GeneratedDir = join(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "s3",
  "src",
  "generated",
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
  "s3-schemas:service": join(s3GeneratedDir, "service.ts"),
  "s3-schemas:enums": join(s3GeneratedDir, "enums.ts"),
  "s3-schemas:structures": join(s3GeneratedDir, "structures.ts"),
  "s3-schemas:schema": join(s3GeneratedDir, "schema.ts"),
};
for (const fileKey of ctx.renderFiles().keys()) {
  if (!fileKey.startsWith("common-schemas:")) {
    continue;
  }
  const rest = fileKey.slice("common-schemas:".length);
  const lastColon = rest.lastIndexOf(":");
  const filename =
    lastColon !== -1
      ? `${rest.slice(0, lastColon)}.${rest.slice(lastColon + 1)}.ts`
      : `${rest}.ts`;
  outputPaths[fileKey] = join(sharedOutputDirectory, filename);
}
await ctx.writeFiles(outputPaths);

console.log("Code generation complete.");
