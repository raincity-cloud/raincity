import { z } from "zod/v4";
import {
  DEPRECATED_TRAIT,
  documentationTrait,
  enumValueTrait,
  PRIVATE_TRAIT,
  traitTrait,
  UNSTABLE_TRAIT,
} from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const enumShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("enum"),
    traits: withoutObjectKeys([PRIVATE_TRAIT, UNSTABLE_TRAIT], {
      ...documentationTrait,
      ...traitTrait,
    }).optional(),
    members: z.record(
      z.string(),
      z
        .object({
          target: z.string(),
          traits: withoutObjectKeys([DEPRECATED_TRAIT], {
            ...documentationTrait,
            ...enumValueTrait,
          }).optional(),
        })
        .strict(),
    ),
  })
  .strict();

export type EnumShape = z.infer<typeof enumShapeSchema>;
