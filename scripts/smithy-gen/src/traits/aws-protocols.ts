import { z } from "zod/v4";

export const httpChecksumTrait = {
  "aws.protocols#httpChecksum": z
    .object({
      requestAlgorithmMember: z.string().optional(),
      requestValidationModeMember: z.string().optional(),
      requestChecksumRequired: z.boolean().optional(),
      responseAlgorithms: z.array(z.string()).optional(),
    })
    .strict()
    .optional(),
};

export const restXmlTrait = {
  "aws.protocols#restXml": z
    .object({
      noErrorWrapping: z.boolean().optional(),
    })
    .strict()
    .optional(),
};
