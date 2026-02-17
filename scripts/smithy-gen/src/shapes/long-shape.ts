import { z } from "zod/v4";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const longShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("long"),
    traits: withoutObjectKeys([], {}).optional(),
  })
  .strict();

export type LongShape = z.infer<typeof longShapeSchema>;
