import { z } from "zod/v4";
import { timestampFormatTrait } from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const timestampShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("timestamp"),
    traits: withoutObjectKeys([], {
      ...timestampFormatTrait,
    }).optional(),
  })
  .strict();

export type TimestampShape = z.infer<typeof timestampShapeSchema>;
