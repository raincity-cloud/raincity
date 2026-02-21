import { z } from "zod/v4";
import {
  documentationTrait,
  traitTrait,
  UNSTABLE_TRAIT,
} from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const documentShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("document"),
    traits: withoutObjectKeys([UNSTABLE_TRAIT], {
      ...documentationTrait,
      ...traitTrait,
    }).optional(),
  })
  .strict();

export type DocumentShape = z.infer<typeof documentShapeSchema>;
