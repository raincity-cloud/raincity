import { markerObjectSchema } from "../zod-helpers.js";

export const unsignedPayloadTrait = {
  "aws.auth#unsignedPayload": markerObjectSchema.strict().optional(),
};
