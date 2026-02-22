import { z } from "zod/v4";
import {
  documentationTrait,
  streamingTrait,
  xmlNameTrait,
} from "../traits/smithy-api.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const unionShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("union"),
    traits: withoutObjectKeys([], {
      ...documentationTrait,
      ...streamingTrait,
    }),
    members: z.record(
      z.string(),
      z
        .object({
          target: z.string(),
          traits: withoutObjectKeys([], {
            ...documentationTrait,
            ...xmlNameTrait,
          }),
        })
        .strict(),
    ),
  })
  .strict();
