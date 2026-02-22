import { readFile, readdir, rm } from "node:fs/promises";
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

async function cleanGeneratedDirectory(dir: string): Promise<void> {
  let entries: Array<{ isFile: () => boolean; name: string }>;
  try {
    entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    // oxlint-disable-next-line no-await-in-loop
    await rm(join(dir, entry.name));
  }
}

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
await cleanGeneratedDirectory(s3GeneratedDir);
await cleanGeneratedDirectory(sharedOutputDirectory);
await ctx.writeFiles(outputPaths);

console.log("Code generation complete.");
