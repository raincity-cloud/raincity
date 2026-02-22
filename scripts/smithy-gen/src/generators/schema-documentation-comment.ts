export function buildSchemaDocumentationComment(
  documentation: string | undefined,
): string | undefined {
  if (!documentation) return undefined;

  const trimmed = documentation.trim();
  if (!trimmed) return undefined;

  const lines = trimmed.split(/\r?\n/);

  return [
    "/**",
    " * ```xml",
    ...lines.map((line) => (line ? ` * ${line}` : " *")),
    " * ```",
    " */",
  ].join("\n");
}
