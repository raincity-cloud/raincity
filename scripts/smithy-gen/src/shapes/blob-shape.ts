import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const blobShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("blob"),
    traits: z.unknown().optional(),
  })
  .strict();
