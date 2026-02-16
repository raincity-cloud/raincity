import { z } from "zod/v4";
import { blobShapeSchema } from "./shapes/blob-shape.js";
import { booleanShapeSchema } from "./shapes/boolean-shape.js";
import { documentShapeSchema } from "./shapes/document-shape.js";
import { enumShapeSchema } from "./shapes/enum-shape.js";
import { integerShapeSchema } from "./shapes/integer-shape.js";
import { listShapeSchema } from "./shapes/list-shape.js";
import { longShapeSchema } from "./shapes/long-shape.js";
import { mapShapeSchema } from "./shapes/map-shape.js";
import { operationShapeSchema } from "./shapes/operation-shape.js";
import { serviceShapeSchema } from "./shapes/service-shape.js";
import { stringShapeSchema } from "./shapes/string-shape.js";
import { structureShapeSchema } from "./shapes/structure-shape.js";
import { timestampShapeSchema } from "./shapes/timestamp-shape.js";
import { unionShapeSchema } from "./shapes/union-shape.js";
import { withoutObjectKeys, withoutRecordKeyPrefixes } from "./zod-helpers.js";

export const smithyAstModelSchema = withoutObjectKeys(
  ["metadata", "smithy"] as const,
  {
    shapes: withoutRecordKeyPrefixes(
      ["smithy.test#", "smithy.waiters#"],
      z.discriminatedUnion("type", [
        blobShapeSchema,
        booleanShapeSchema,
        documentShapeSchema,
        enumShapeSchema,
        integerShapeSchema,
        listShapeSchema,
        longShapeSchema,
        mapShapeSchema,
        operationShapeSchema,
        serviceShapeSchema,
        stringShapeSchema,
        structureShapeSchema,
        timestampShapeSchema,
        unionShapeSchema,
      ]),
    ),
  },
);

export type SmithyAstModel = z.infer<typeof smithyAstModelSchema>;
