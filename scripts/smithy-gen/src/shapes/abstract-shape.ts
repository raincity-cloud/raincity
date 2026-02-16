import { z } from "zod/v4";

export const abstractShapeSchema = z.object({
  type: z.string(),
});
