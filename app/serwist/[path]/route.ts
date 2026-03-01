import { createSerwistRoute } from "@serwist/turbopack";
import { nanoid } from "nanoid";

const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? nanoid();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
	{
		additionalPrecacheEntries: [
			{ url: "/~offline", revision },
			{ url: "/icons/offline-placeholder.svg", revision },
		],
		swSrc: "app/sw.ts",
		useNativeEsbuild: true,
	},
);
