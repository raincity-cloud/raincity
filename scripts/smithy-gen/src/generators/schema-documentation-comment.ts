export function buildSchemaDocumentationComment(
  documentation: string | undefined,
): string | undefined {
  if (!documentation) return undefined;

  const trimmed = documentation.trim();
  if (!trimmed) return undefined;

  const safeDocumentation = trimmed.replaceAll("*/", "*\\/");
  const lines = safeDocumentation.split(/\r?\n/);

  if (lines.length === 1) {
    return `/** ${lines[0]} */`;
  }

  return [
    "/**",
    ...lines.map((line) => (line ? ` * ${line}` : " *")),
    " */",
  ].join("\n");
}
