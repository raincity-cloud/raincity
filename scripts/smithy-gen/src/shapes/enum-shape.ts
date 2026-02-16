import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const enumShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("enum"),
    traits: z.unknown().optional(),
    members: z.unknown(),
  })
  .strict();
