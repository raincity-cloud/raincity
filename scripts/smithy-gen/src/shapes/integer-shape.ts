import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const integerShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("integer"),
    traits: z.unknown().optional(),
  })
  .strict();
