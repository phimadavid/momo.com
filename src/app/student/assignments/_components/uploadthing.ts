import { generateReactHelpers } from "@uploadthing/react";

import type { UploadRouter } from "~/server/uploadthing";

/** Typed client for the routes in `src/server/uploadthing.ts`. */
export const { useUploadThing } = generateReactHelpers<UploadRouter>();
