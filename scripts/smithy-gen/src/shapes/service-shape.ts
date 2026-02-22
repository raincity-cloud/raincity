import { z } from "zod/v4";
import { serviceTrait } from "../traits/aws-api.js";
import { sigv4Trait } from "../traits/aws-auth.js";
import { restXmlTrait } from "../traits/aws-protocols.js";
import {
  documentationTrait,
  SUPPRESS_TRAIT,
  titleTrait,
  xmlNamespaceTrait,
} from "../traits/smithy-api.js";
import {
  clientContextParamsTrait,
  ENDPOINT_TESTS_TRAIT,
  endpointRuleSetTrait,
} from "../traits/smithy-rules.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const serviceShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("service"),
    traits: withoutObjectKeys([ENDPOINT_TESTS_TRAIT, SUPPRESS_TRAIT], {
      ...clientContextParamsTrait,
      ...documentationTrait,
      ...endpointRuleSetTrait,
      ...restXmlTrait,
      ...serviceTrait,
      ...sigv4Trait,
      ...titleTrait,
      ...xmlNamespaceTrait,
    }).optional(),
    version: z.string(),
    operations: z.array(
      z
        .object({
          target: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

export type ServiceShape = z.infer<typeof serviceShapeSchema>;
