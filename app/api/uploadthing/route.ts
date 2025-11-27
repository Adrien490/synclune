import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

// Export routes pour Next.js App Router
export const { GET, POST } = createRouteHandler({
	router: ourFileRouter,
	config: {
		/**
		 * Configuration UploadThing
		 * - callbackUrl: URL de callback après upload (auto-détecté par défaut)
		 * - uploadthingId: ID custom si plusieurs apps (optionnel)
		 */
		logLevel: process.env.NODE_ENV === "development" ? "Debug" : "Error",
	},
});


