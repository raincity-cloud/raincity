import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const longShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("long"),
    traits: z.unknown().optional(),
  })
  .strict();
