import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { connection } from "next/server";
import { extractRouterConfig } from "uploadthing/server";
export async function UploadThingSSR() {
	await connection();
	return (
		<NextSSRPlugin
			/**
			 * Extracts only route configurations to avoid
			 * leaking sensitive information to the client
			 */
			routerConfig={extractRouterConfig(ourFileRouter)}
		/>
	);
}
