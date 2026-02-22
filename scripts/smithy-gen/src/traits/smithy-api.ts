import { z } from "zod/v4";
import { markerObjectSchema } from "../zod-helpers.js";

export const authTrait = {
  "smithy.api#auth": z.array(z.string()).optional(),
};

export const authDefinitionTrait = {
  "smithy.api#authDefinition": z
    .object({
      traits: z.array(z.string()).optional(),
    })
    .strict()
    .optional(),
};

export const defaultTrait = {
  "smithy.api#default": z.union([z.boolean(), z.string()]).optional(),
};

export const DEPRECATED_TRAIT = "smithy.api#deprecated" as const;

export const documentationTrait = {
  "smithy.api#documentation": z.string().optional(),
};

export const endpointTrait = {
  "smithy.api#endpoint": z
    .object({
      hostPrefix: z.string(),
    })
    .strict()
    .optional(),
};

export enum ErrorTraitType {
  Client = "client",
  Server = "server",
}

export const errorTrait = {
  "smithy.api#error": z.enum(ErrorTraitType).optional(),
};

export const enumValueTrait = {
  "smithy.api#enumValue": z.string().optional(),
};

export const eventPayloadTrait = {
  "smithy.api#eventPayload": markerObjectSchema.strict().optional(),
};

export const EXAMPLES_TRAIT = "smithy.api#examples" as const;

export const externalDocumentationTrait = {
  "smithy.api#externalDocumentation": z
    .object({
      Reference: z.string(),
      Examples: z.string().optional(),
    })
    .strict()
    .optional(),
};

export const hostLabelTrait = {
  "smithy.api#hostLabel": markerObjectSchema.strict().optional(),
};

export const httpErrorTrait = {
  "smithy.api#httpError": z.int().gte(100).lte(599).optional(),
};

export const httpHeaderTrait = {
  "smithy.api#httpHeader": z.string().optional(),
};

export const httpQueryTrait = {
  "smithy.api#httpQuery": z.string().optional(),
};

export const httpLabelTrait = {
  "smithy.api#httpLabel": markerObjectSchema.strict().optional(),
};

export const httpPayloadTrait = {
  "smithy.api#httpPayload": markerObjectSchema.strict().optional(),
};

export const httpPrefixHeadersTrait = {
  "smithy.api#httpPrefixHeaders": z.string().optional(),
};

export const httpTrait = {
  "smithy.api#http": z
    .object({
      code: z.int().gte(100).lte(599),
      method: z.enum(["HEAD", "GET", "POST", "PUT", "PATCH", "DELETE"]),
      uri: z.string(),
    })
    .strict()
    .optional(),
};

export const idRefTrait = {
  "smithy.api#idRef": z
    .object({
      failWhenMissing: z.boolean().optional(),
      selector: z.string(),
    })
    .strict()
    .optional(),
};

export const idempotencyTokenTrait = {
  "smithy.api#idempotencyToken": markerObjectSchema.strict().optional(),
};

export const inputTrait = {
  "smithy.api#input": markerObjectSchema.strict().optional(),
};

export const INTERNAL_TRAIT = "smithy.api#internal" as const;

export const lengthTrait = {
  "smithy.api#length": z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .strict()
    .optional(),
};

export const MIXIN_TRAIT = "smithy.api#mixin" as const;

export const outputTrait = {
  "smithy.api#output": markerObjectSchema.strict().optional(),
};

export const paginatedTrait = {
  "smithy.api#paginated": z
    .object({
      inputToken: z.string(),
      outputToken: z.string(),
      items: z.string().optional(),
      pageSize: z.string(),
    })
    .strict()
    .optional(),
};

export const patternTrait = {
  "smithy.api#pattern": z.string().optional(),
};

export const PRIVATE_TRAIT = "smithy.api#private" as const;

export const protocolDefinitionTrait = {
  "smithy.api#protocolDefinition": z
    .object({
      traits: z.array(z.string()),
    })
    .strict()
    .optional(),
};

export const rangeTrait = {
  "smithy.api#range": z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .strict()
    .optional(),
};

export const RECOMMENDED_TRAIT = "smithy.api#recommended" as const;

export const requiredTrait = {
  "smithy.api#required": markerObjectSchema.strict().optional(),
};

export const sensitiveTrait = {
  "smithy.api#sensitive": markerObjectSchema.strict().optional(),
};

export const streamingTrait = {
  "smithy.api#streaming": markerObjectSchema.strict().optional(),
};

export const SUPPRESS_TRAIT = "smithy.api#suppress" as const;

export const TAGS_TRAIT = "smithy.api#tags" as const;

export const timestampFormatTrait = {
  "smithy.api#timestampFormat": z.enum(["date-time", "http-date"]).optional(),
};

export const titleTrait = {
  "smithy.api#title": z.string().optional(),
};

export const traitTrait = {
  "smithy.api#trait": z
    .object({
      selector: z.string(),
      conflicts: z.array(z.string()).optional(),
      breakingChanges: z
        .array(
          z
            .object({
              change: z.enum(["remove", "any", "presence"]),
              severity: z.enum(["DANGER"]).optional(),
              message: z.string().optional(),
              path: z.string().optional(),
            })
            .strict(),
        )
        .optional(),
    })
    .strict()
    .optional(),
};

const traitValidator = z
  .object({
    message: z.string(),
    selector: z.string(),
    severity: z.string().optional(),
  })
  .strict()
  .optional();

export const traitValidatorsTrait = {
  "smithy.api#traitValidators": z
    .object({
      "rpcv2Cbor.NoDocuments": traitValidator,
      UnsupportedProtocolDocument: traitValidator,
    })
    .optional(),
};

export const uniqueItemsTrait = {
  "smithy.api#uniqueItems": markerObjectSchema.strict().optional(),
};

export const UNSTABLE_TRAIT = "smithy.api#unstable";

export const xmlAttributeTrait = {
  "smithy.api#xmlAttribute": markerObjectSchema.strict().optional(),
};

export const xmlFlattenedTrait = {
  "smithy.api#xmlFlattened": markerObjectSchema.strict().optional(),
};

export const xmlNamespaceTrait = {
  "smithy.api#xmlNamespace": z
    .object({
      prefix: z.string().optional(),
      uri: z.string(),
    })
    .strict()
    .optional(),
};

export const xmlNameTrait = {
  "smithy.api#xmlName": z.string().optional(),
};
