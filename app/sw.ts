import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
	ExpirationPlugin,
	NetworkOnly,
	Serwist,
} from "serwist";
import { isApiPath, isSensitiveNavigationPath, isStripeHost } from "./sw-routing";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

/** A document or RSC navigation request (used for offline fallback routing). */
function isNavigationRequest(request: Request): boolean {
	return request.destination === "document" || request.headers.get("RSC") === "1";
}

// Custom runtime caching strategies per resource type.
//
// ORDER MATTERS: the first matching entry wins. NetworkOnly guards (Stripe, API,
// sensitive navigations) are declared BEFORE the cacheable fallbacks so that
// authenticated / payment-critical traffic can never be served stale from disk.
const runtimeCaching: RuntimeCaching[] = [
	// Stripe.js + Stripe API — NetworkOnly (PWA-AUDIT-009).
	// Caching Stripe.js is forbidden and a stale copy breaks the payment form.
	{
		matcher({ url }) {
			return isStripeHost(url.hostname);
		},
		handler: new NetworkOnly(),
	},
	// Same-origin API routes — NetworkOnly (PWA-AUDIT-001).
	// Never persist authenticated/sensitive payloads (admin export, invoice &
	// credit-note PDFs, order status, auth session, many `Cache-Control: no-store`)
	// to Cache Storage, and never serve them stale offline.
	{
		matcher({ url, sameOrigin }) {
			return sameOrigin && isApiPath(url.pathname);
		},
		handler: new NetworkOnly(),
	},
	// Admin + checkout navigations — NetworkOnly (PWA-AUDIT-003 / PWA-AUDIT-004).
	// Avoid serving a stale admin view or a stale checkout page (expired
	// PaymentIntent clientSecret) and avoid persisting authenticated HTML/RSC.
	// Offline failures still resolve to the `/~offline` fallback below.
	{
		matcher({ url, request, sameOrigin }) {
			return sameOrigin && isNavigationRequest(request) && isSensitiveNavigationPath(url.pathname);
		},
		handler: new NetworkOnly(),
	},
	// UploadThing CDN images — CacheFirst (immutable, content-addressed)
	{
		matcher: /^https:\/\/(utfs\.io|.*\.ufs\.sh)\/.*/i,
		handler: new CacheFirst({
			cacheName: "uploadthing-images",
			plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
		}),
	},
	// Next.js image optimization — StaleWhileRevalidate
	{
		matcher({ url }) {
			return url.pathname.startsWith("/_next/image");
		},
		handler: new StaleWhileRevalidate({
			cacheName: "next-images",
			plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })],
		}),
	},
	// Product detail pages — NetworkFirst (cache visited pages for offline)
	{
		matcher({ url }) {
			return /^\/creations\/[^/]+\/?$/.test(url.pathname);
		},
		handler: new NetworkFirst({
			cacheName: "product-pages",
			networkTimeoutSeconds: 5,
			plugins: [
				new ExpirationPlugin({
					maxEntries: 20,
					maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
				}),
			],
		}),
	},
	// Public navigation requests (HTML pages + RSC fetches) — NetworkFirst for
	// offline support. Admin/checkout/API are handled by the NetworkOnly guards above.
	{
		matcher({ request }) {
			return isNavigationRequest(request);
		},
		handler: new NetworkFirst({
			cacheName: "navigations",
			networkTimeoutSeconds: 5,
			plugins: [
				new ExpirationPlugin({
					maxEntries: 50,
					maxAgeSeconds: 60 * 60 * 24, // 1 day
				}),
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
	runtimeCaching,
	fallbacks: {
		entries: [
			{
				url: "/~offline",
				matcher({ request }) {
					return request.destination === "document" || request.headers.get("RSC") === "1";
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

// NOTE: push notifications and Periodic Background Sync handlers were removed
// (PWA-AUDIT-006 / PWA-AUDIT-007): they targeted endpoints that do not exist
// (`/api/push/*`, `/api/wishlist/sync`) and had no client-side subscription/
// registration, so they were dead code. Re-introduce them together with the
// server endpoints + a client subscription flow if/when push is implemented.
