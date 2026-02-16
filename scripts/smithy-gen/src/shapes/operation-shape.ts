import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const operationShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("operation"),
    traits: z.unknown().optional(),
    input: z.unknown(),
    output: z.unknown(),
    errors: z.unknown(),
  })
  .strict();
