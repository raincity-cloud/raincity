import { z } from "zod/v4";

export const contextParamTrait = {
  "smithy.rules#contextParam": z
    .object({
      name: z.string(),
    })
    .strict()
    .optional(),
};
