import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
	ExpirationPlugin,
	BackgroundSyncPlugin,
	NetworkOnly,
	Serwist,
} from "serwist";

declare global {
	interface WorkerGlobalScope extends SerwistGlobalConfig {
		__SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
	}
}

declare const self: ServiceWorkerGlobalScope;

// Background Sync queue for cart mutations — retries failed POSTs when
// connectivity returns (max 24h in-queue, max 50 attempts per entry).
// Covers: add-to-cart, update-quantity, remove-item, apply-discount, etc.
const cartMutationsSync = new BackgroundSyncPlugin("synclune-cart-mutations", {
	maxRetentionTime: 60 * 24, // minutes (24h)
});

// Background Sync queue for wishlist mutations (toggle items).
const wishlistMutationsSync = new BackgroundSyncPlugin("synclune-wishlist-mutations", {
	maxRetentionTime: 60 * 24,
});

// Custom runtime caching strategies per resource type
const runtimeCaching: RuntimeCaching[] = [
	// UploadThing CDN images — CacheFirst (immutable, content-addressed)
	{
		matcher: /^https:\/\/(utfs\.io|.*\.ufs\.sh)\/.*/i,
		handler: new CacheFirst({
			cacheName: "uploadthing-images",
			plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 })],
		}),
	},
	// Cart mutations — Background Sync retry when offline
	{
		matcher({ url, request, sameOrigin }) {
			return (
				sameOrigin &&
				request.method === "POST" &&
				(url.pathname.startsWith("/api/cart") || url.searchParams.has("_rsc"))
			);
		},
		method: "POST",
		handler: new NetworkOnly({ plugins: [cartMutationsSync] }),
	},
	// Wishlist mutations — Background Sync retry
	{
		matcher({ url, request, sameOrigin }) {
			return sameOrigin && request.method === "POST" && url.pathname.startsWith("/api/wishlist");
		},
		method: "POST",
		handler: new NetworkOnly({ plugins: [wishlistMutationsSync] }),
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
	// API routes — NetworkFirst (fresh data preferred, offline fallback)
	{
		matcher({ url, sameOrigin }) {
			return sameOrigin && url.pathname.startsWith("/api/");
		},
		handler: new NetworkFirst({
			cacheName: "api-responses",
			networkTimeoutSeconds: 5,
			plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 })],
		}),
	},
	// Navigation requests (HTML pages + RSC fetches) — NetworkFirst for offline support
	{
		matcher({ request }) {
			return request.destination === "document" || request.headers.get("RSC") === "1";
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

// ---------------------------------------------------------------------------
// Push notifications (wishlist restock, order updates)
// Requires VAPID keys in env + server endpoint /api/push/subscribe + /api/push/send.
// ---------------------------------------------------------------------------

interface SynclunePushPayload {
	title: string;
	body: string;
	url?: string;
	icon?: string;
	badge?: string;
	tag?: string;
}

self.addEventListener("push", (event) => {
	if (!event.data) return;
	let payload: SynclunePushPayload;
	try {
		payload = event.data.json() as SynclunePushPayload;
	} catch {
		payload = { title: "Synclune", body: event.data.text() };
	}

	const promise = self.registration.showNotification(payload.title, {
		body: payload.body,
		icon: payload.icon ?? "/icons/icon-192x192.png",
		badge: payload.badge ?? "/icons/android-icon-96x96.png",
		tag: payload.tag,
		data: { url: payload.url ?? "/" },
	});
	event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data as { url?: string } | null)?.url ?? "/";

	event.waitUntil(
		(async () => {
			const windowClients = await self.clients.matchAll({
				type: "window",
				includeUncontrolled: true,
			});
			for (const client of windowClients) {
				if ("focus" in client) {
					const clientUrl = new URL(client.url);
					if (clientUrl.pathname === targetUrl) {
						return client.focus();
					}
				}
			}
			return self.clients.openWindow(targetUrl);
		})(),
	);
});

// ---------------------------------------------------------------------------
// Periodic Background Sync — refresh wishlist restock status in the background
// Browsers currently supporting this: Chrome/Edge Android only.
// Requires a /api/wishlist/sync endpoint to exist on the origin.
// ---------------------------------------------------------------------------

self.addEventListener("periodicsync", (event) => {
	const periodicEvent = event as ExtendableEvent & { tag: string };
	if (periodicEvent.tag === "wishlist-restock-sync") {
		periodicEvent.waitUntil(
			fetch("/api/wishlist/sync", { method: "POST", credentials: "include" }).catch(
				() => undefined,
			),
		);
	}
});
