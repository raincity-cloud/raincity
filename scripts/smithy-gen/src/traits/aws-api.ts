import { z } from "zod/v4";

export const serviceTrait = {
  "aws.api#service": z
    .object({
      arnNamespace: z.string(),
      cloudFormationName: z.string(),
      cloudTrailEventSource: z.string(),
      endpointPrefix: z.string(),
      sdkId: z.string(),
    })
    .strict()
    .optional(),
};
