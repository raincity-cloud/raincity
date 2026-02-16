import { z } from "zod/v4";
import {
  documentationTrait,
  idRefTrait,
  lengthTrait,
  PRIVATE_TRAIT,
  patternTrait,
  sensitiveTrait,
  traitTrait,
} from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const stringShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("string"),
    traits: withoutObjectKeys([PRIVATE_TRAIT], {
      ...documentationTrait,
      ...idRefTrait,
      ...lengthTrait,
      ...patternTrait,
      ...sensitiveTrait,
      ...traitTrait,
    }).optional(),
  })
  .strict();

export type StringShape = z.infer<typeof stringShapeSchema>;
