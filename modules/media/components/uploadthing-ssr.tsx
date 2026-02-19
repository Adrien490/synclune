import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";

const routerConfig = extractRouterConfig(ourFileRouter);

export function UploadThingSSR() {
	return <NextSSRPlugin routerConfig={routerConfig} />;
}
