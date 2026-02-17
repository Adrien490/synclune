import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin, Serwist } from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

// Custom runtime caching strategies per resource type
const runtimeCaching: RuntimeCaching[] = [
	// Google Fonts stylesheets — StaleWhileRevalidate (change rarely)
	{
		matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
		handler: new StaleWhileRevalidate({
			cacheName: "google-fonts-stylesheets",
			plugins: [
				new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
			],
		}),
	},
	// Google Fonts files — CacheFirst (immutable, content-hashed URLs)
	{
		matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
		handler: new CacheFirst({
			cacheName: "google-fonts-webfonts",
			plugins: [
				new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
			],
		}),
	},
	// UploadThing CDN images — CacheFirst (immutable, content-addressed)
	{
		matcher: /^https:\/\/(utfs\.io|.*\.ufs\.sh)\/.*/i,
		handler: new CacheFirst({
			cacheName: "uploadthing-images",
			plugins: [
				new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
			],
		}),
	},
	// Next.js image optimization — StaleWhileRevalidate
	{
		matcher: /^\/_next\/image\?.*/i,
		handler: new StaleWhileRevalidate({
			cacheName: "next-images",
			plugins: [
				new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
			],
		}),
	},
	// API routes — NetworkFirst (fresh data preferred, offline fallback)
	{
		matcher: /^\/api\/.*/i,
		handler: new NetworkFirst({
			cacheName: "api-responses",
			networkTimeoutSeconds: 5,
			plugins: [
				new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
			],
		}),
	},
	// Default cache for everything else
	...defaultCache,
];

const serwist = new Serwist({
	precacheEntries: self.__SW_MANIFEST,
	skipWaiting: true,
	clientsClaim: true,
	navigationPreload: true,
	runtimeCaching,
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					return request.destination === "document";
				},
			},
			{
				url: "/icons/offline-placeholder.svg",
				matcher({ request }) {
					return request.destination === "image";
				},
			},
		],
	},
});

serwist.addEventListeners();
