import { z } from "zod/v4";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const booleanShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("boolean"),
    traits: withoutObjectKeys([], {}).optional(),
  })
  .strict();

export type BooleanShape = z.infer<typeof booleanShapeSchema>;
