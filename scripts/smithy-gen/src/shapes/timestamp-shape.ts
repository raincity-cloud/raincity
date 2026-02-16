import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const timestampShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("timestamp"),
    traits: z.unknown().optional(),
  })
  .strict();
