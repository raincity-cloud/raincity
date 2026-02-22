import { markerObjectSchema } from "../zod-helpers.js";

export const s3UnwrappedXmlOutput = {
  "aws.customizations#s3UnwrappedXmlOutput": markerObjectSchema
    .strict()
    .optional(),
};
