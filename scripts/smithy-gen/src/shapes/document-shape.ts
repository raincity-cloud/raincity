import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const documentShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("document"),
    traits: z.unknown().optional(),
  })
  .strict();
