import { z } from "zod/v4";

export const clientContextParamsTrait = {
  "smithy.rules#clientContextParams": z
    .record(
      z.string(),
      z
        .object({
          documentation: z.string().optional(),
          type: z.string(),
        })
        .strict(),
    )
    .optional(),
};

export const contextParamTrait = {
  "smithy.rules#contextParam": z
    .object({
      name: z.string(),
    })
    .strict()
    .optional(),
};

export const endpointRuleSetTrait = {
  "smithy.rules#endpointRuleSet": z
    .object({
      version: z.string().optional(),
      parameters: z.record(
        z.string(),
        z
          .object({
            builtIn: z.string().optional(),
            default: z.boolean().optional(),
            documentation: z.string().optional(),
            required: z.boolean().optional(),
            type: z.string(),
          })
          .strict()
          .optional(),
      ),
      rules: z.unknown(),
    })
    .strict()
    .optional(),
};

export const ENDPOINT_TESTS_TRAIT = "smithy.rules#endpointTests" as const;

const staticContextParam = z
  .object({
    value: z.boolean(),
  })
  .strict()
  .optional();

export const staticContextParams = {
  "smithy.rules#staticContextParams": z
    .object({
      DisableAccessPoints: staticContextParam,
      DisableS3ExpressSessionAuth: staticContextParam,
      UseObjectLambdaEndpoint: staticContextParam,
      UseS3ExpressControlEndpoint: staticContextParam,
    })
    .strict()
    .optional(),
};
