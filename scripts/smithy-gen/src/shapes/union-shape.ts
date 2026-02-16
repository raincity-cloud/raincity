import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const unionShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("union"),
    traits: z.unknown().optional(),
    members: z.unknown(),
  })
  .strict();
