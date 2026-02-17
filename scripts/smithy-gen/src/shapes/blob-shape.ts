import { z } from "zod/v4";
import { streamingTrait } from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const blobShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("blob"),
    traits: withoutObjectKeys([], {
      ...streamingTrait,
    }).optional(),
  })
  .strict();

export type BlobShape = z.infer<typeof blobShapeSchema>;
