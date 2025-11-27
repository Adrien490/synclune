import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { connection } from "next/server";
import { extractRouterConfig } from "uploadthing/server";
export async function UploadThingSSR() {
	await connection();
	return (
		<NextSSRPlugin
			/**
			 * Extrait uniquement les configurations des routes pour éviter
			 * de divulguer des informations sensibles au client
			 */
			routerConfig={extractRouterConfig(ourFileRouter)}
		/>
	);
}
