import { z } from "zod/v4";
import {
  documentationTrait,
  lengthTrait,
  PRIVATE_TRAIT,
  SUPPRESS_TRAIT,
  UNSTABLE_TRAIT,
  uniqueItemsTrait,
  xmlNameTrait,
} from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const listShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("list"),
    traits: withoutObjectKeys([SUPPRESS_TRAIT, PRIVATE_TRAIT, UNSTABLE_TRAIT], {
      ...documentationTrait,
      ...lengthTrait,
      ...uniqueItemsTrait,
    }).optional(),
    member: z
      .object({
        target: z.string(),
        traits: withoutObjectKeys([], {
          ...documentationTrait,
          ...xmlNameTrait,
        }).optional(),
      })
      .strict(),
  })
  .strict();

export type ListShape = z.infer<typeof listShapeSchema>;
