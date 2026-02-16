import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const booleanShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("boolean"),
    traits: z.unknown().optional(),
  })
  .strict();
