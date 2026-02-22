function isTraitRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function buildSchemaTraitTodoComments(
  traits: unknown,
  excludedTraitKeys: ReadonlySet<string>,
  location: string,
): string[] {
  if (!isTraitRecord(traits)) return [];

  const comments: string[] = [];
  const traitKeys = Object.keys(traits).toSorted((a, b) => a.localeCompare(b));

  for (const traitKey of traitKeys) {
    if (excludedTraitKeys.has(traitKey)) {
      continue;
    }

    const traitValue = traits[traitKey];
    if (traitValue === undefined) {
      continue;
    }

    comments.push(
      `// TODO: ${traitKey} (${JSON.stringify(traitValue)}) on ${location} is not mapped to zod.`,
    );
  }

  return comments;
}
