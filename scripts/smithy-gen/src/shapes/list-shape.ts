import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const listShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("list"),
    traits: z.unknown().optional(),
    member: z.unknown(),
  })
  .strict();
