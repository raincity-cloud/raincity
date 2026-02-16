import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const serviceShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("service"),
    traits: z.unknown().optional(),
    version: z.unknown(),
    operations: z.unknown(),
  })
  .strict();
