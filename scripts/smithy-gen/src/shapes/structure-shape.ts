import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const structureShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("structure"),
    traits: z.unknown().optional(),
    members: z.unknown(),
    mixins: z.unknown(),
  })
  .strict();
