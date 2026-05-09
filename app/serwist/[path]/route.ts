import { createSerwistRoute } from "@serwist/turbopack";
import { nanoid } from "nanoid";
import * as Sentry from "@sentry/nextjs";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? nanoid();

const fallbackResponse = () =>
	new Response("// Service worker unavailable", {
		headers: { "Content-Type": "application/javascript" },
	});

let routeExports;
try {
	routeExports = createSerwistRoute({
		additionalPrecacheEntries: [{ url: "/~offline", revision }],
		swSrc: "app/sw.ts",
		useNativeEsbuild: false,
		// Allow large lazy-loaded chunks (e.g. recharts bundle ~2.7 MB) in precache
		maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
	});
} catch (error) {
	Sentry.captureException(error, { tags: { component: "serwist-route" } });
	routeExports = {
		dynamic: "force-dynamic" as const,
		dynamicParams: true,
		revalidate: false,
		generateStaticParams: () => [{ path: "sw.js" }],
		GET: fallbackResponse,
	};
}

// Wrap the GET handler with runtime error handling to prevent 500s.
// The build-time try-catch above only covers createSerwistRoute() compilation.
// If the generated GET handler throws at request time, Next.js returns a 500,
// preventing new SW registration and leaving stale SWs active.
const originalGET = routeExports.GET;
const safeGET = async (request: Request, context: { params: Promise<{ path: string }> }) => {
	try {
		return await originalGET(request, context);
	} catch (error) {
		Sentry.captureException(error, { tags: { component: "serwist-get" } });
		return fallbackResponse();
	}
};

export const { dynamic, dynamicParams, revalidate, generateStaticParams } = routeExports;
export const GET = safeGET;
