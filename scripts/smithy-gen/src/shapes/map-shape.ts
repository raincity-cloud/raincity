import { z } from "zod/v4";
import { PRIVATE_TRAIT } from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const mapShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("map"),
    traits: withoutObjectKeys([PRIVATE_TRAIT], {}).optional(),
    key: z
      .object({
        target: z.string(),
      })
      .strict(),
    value: z
      .object({
        target: z.string(),
      })
      .strict(),
  })
  .strict();

export type MapShape = z.infer<typeof mapShapeSchema>;
