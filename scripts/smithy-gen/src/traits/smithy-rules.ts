import { z } from "zod/v4";

export const contextParamTrait = {
  "smithy.rules#contextParam": z
    .object({
      name: z.string(),
    })
    .strict()
    .optional(),
};

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
