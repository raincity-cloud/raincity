import { z } from "zod/v4";
import { unsignedPayloadTrait } from "../traits/aws-auth.js";
import { s3UnwrappedXmlOutput } from "../traits/aws-customizations.js";
import { httpChecksumTrait } from "../traits/aws-protocols.js";
import {
  authTrait,
  documentationTrait,
  EXAMPLES_TRAIT,
  endpointTrait,
  httpTrait,
  paginatedTrait,
} from "../traits/smithy-api.js";
import { staticContextParams } from "../traits/smithy-rules.js";
import { WAITABLE_TRAIT } from "../traits/smithy-waiters.js";
import { withoutObjectKeys } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const operationShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("operation"),
    traits: withoutObjectKeys([EXAMPLES_TRAIT, WAITABLE_TRAIT], {
      ...authTrait,
      ...documentationTrait,
      ...endpointTrait,
      ...httpChecksumTrait,
      ...httpTrait,
      ...paginatedTrait,
      ...s3UnwrappedXmlOutput,
      ...staticContextParams,
      ...unsignedPayloadTrait,
    }).optional(),
    input: z
      .object({
        target: z.string(),
      })
      .strict(),
    output: z
      .object({
        target: z.string(),
      })
      .strict(),
    errors: z
      .array(
        z
          .object({
            target: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type OperationShape = z.infer<typeof operationShapeSchema>;
