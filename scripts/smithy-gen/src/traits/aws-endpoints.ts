import { markerObjectSchema } from "../zod-helpers.js";

export const endpointsModifier = {
  "aws.endpoints#endpointsModifier": markerObjectSchema.strict().optional(),
};
