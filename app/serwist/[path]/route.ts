import { createSerwistRoute } from "@serwist/turbopack";
import { nanoid } from "nanoid";
import * as Sentry from "@sentry/nextjs";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? nanoid();

let routeExports;
try {
	routeExports = createSerwistRoute({
		additionalPrecacheEntries: [
			{ url: "/~offline", revision },
			{ url: "/icons/offline-placeholder.svg", revision },
		],
		swSrc: "app/sw.ts",
		useNativeEsbuild: true,
	});
} catch (error) {
	Sentry.captureException(error, { tags: { component: "serwist-route" } });
	const fallbackGET = () =>
		new Response("// Service worker unavailable", {
			headers: { "Content-Type": "application/javascript" },
		});
	routeExports = {
		dynamic: "force-dynamic" as const,
		dynamicParams: true,
		revalidate: false,
		generateStaticParams: () => [{ path: "sw.js" }],
		GET: fallbackGET,
	};
}

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = routeExports;
