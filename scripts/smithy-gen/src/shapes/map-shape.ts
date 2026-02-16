import { z } from "zod/v4";
import { abstractShapeSchema } from "./abstract-shape.js";

export const mapShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("map"),
    traits: z.unknown().optional(),
    key: z.unknown(),
    value: z.unknown(),
  })
  .strict();
