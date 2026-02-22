import { z } from "zod/v4";
import { endpointsModifier } from "../traits/aws-endpoints.js";
import {
  authDefinitionTrait,
  DEPRECATED_TRAIT,
  defaultTrait,
  documentationTrait,
  errorTrait,
  eventPayloadTrait,
  externalDocumentationTrait,
  hostLabelTrait,
  httpErrorTrait,
  httpHeaderTrait,
  httpLabelTrait,
  httpPayloadTrait,
  httpPrefixHeadersTrait,
  httpQueryTrait,
  INTERNAL_TRAIT,
  idempotencyTokenTrait,
  idRefTrait,
  inputTrait,
  lengthTrait,
  MIXIN_TRAIT,
  outputTrait,
  PRIVATE_TRAIT,
  protocolDefinitionTrait,
  RECOMMENDED_TRAIT,
  rangeTrait,
  requiredTrait,
  SUPPRESS_TRAIT,
  TAGS_TRAIT,
  traitTrait,
  traitValidatorsTrait,
  UNSTABLE_TRAIT,
  xmlAttributeTrait,
  xmlFlattenedTrait,
  xmlNamespaceTrait,
  xmlNameTrait,
} from "../traits/smithy-api.js";
import { contextParamTrait } from "../traits/smithy-rules.js";
import { withoutObjectKeys, withoutRecordKeyPrefixes } from "../zod-helpers.js";
import { abstractShapeSchema } from "./abstract-shape.js";

export const structureShapeSchema = abstractShapeSchema
  .extend({
    type: z.literal("structure"),
    traits: withoutObjectKeys(
      [
        DEPRECATED_TRAIT,
        INTERNAL_TRAIT,
        MIXIN_TRAIT,
        PRIVATE_TRAIT,
        SUPPRESS_TRAIT,
        TAGS_TRAIT,
        UNSTABLE_TRAIT,
      ],
      {
        ...authDefinitionTrait,
        ...endpointsModifier,
        ...documentationTrait,
        ...errorTrait,
        ...externalDocumentationTrait,
        ...httpErrorTrait,
        ...inputTrait,
        ...outputTrait,
        ...protocolDefinitionTrait,
        ...traitTrait,
        ...traitValidatorsTrait,
        ...xmlNameTrait,
      },
    ).optional(),
    members: withoutRecordKeyPrefixes(
      ["smithy.rules#"],
      z
        .object({
          target: z.string(),
          traits: withoutObjectKeys([DEPRECATED_TRAIT, RECOMMENDED_TRAIT], {
            ...contextParamTrait,
            ...defaultTrait,
            ...documentationTrait,
            ...eventPayloadTrait,
            ...externalDocumentationTrait,
            ...hostLabelTrait,
            ...httpHeaderTrait,
            ...httpLabelTrait,
            ...httpPayloadTrait,
            ...httpPrefixHeadersTrait,
            ...httpQueryTrait,
            ...idempotencyTokenTrait,
            ...idRefTrait,
            ...lengthTrait,
            ...rangeTrait,
            ...requiredTrait,
            ...xmlAttributeTrait,
            ...xmlFlattenedTrait,
            ...xmlNamespaceTrait,
            ...xmlNameTrait,
          }).optional(),
        })
        .strict()
        .optional(),
    ),
    mixins: z.unknown(),
  })
  .strict();

export type StructureShape = z.infer<typeof structureShapeSchema>;
