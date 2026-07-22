import { createUploadthing } from "uploadthing/server";
import { createRouteHandler } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

export const ourFileRouter = {
  certificateUploader: f({
    "text/plain": { maxFileSize: "1MB", maxFileCount: 4 },
  })
    .middleware(async ({ req }) => {
      const { userId, orgId } = await auth();
      if (!userId) throw new UploadThingError("Unauthorized");
      return { userId, orgId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        userId: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
      };
    }),
};

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
