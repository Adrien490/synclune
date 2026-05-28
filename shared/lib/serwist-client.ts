"use client";

import { useEffect, type ReactNode } from "react";

interface SerwistProviderProps {
	children: ReactNode;
	swUrl: string;
}

/**
 * Caches that may hold navigational content tied to a previous session.
 * `api-responses` no longer exists (API is NetworkOnly) but is deleted defensively
 * in case an older SW left entries behind after an update.
 */
const SENSITIVE_CACHE_NAMES = ["navigations", "api-responses"] as const;

/**
 * Purge navigation caches on logout so a previous user's cached pages are never
 * served on a shared device (PWA-AUDIT-010). Sensitive admin/order/auth traffic is
 * already NetworkOnly and never cached; this is a defensive cleanup. Best-effort —
 * failures are swallowed so logout is never blocked.
 */
export async function clearSensitiveCaches(): Promise<void> {
	if (typeof caches === "undefined") return;
	try {
		await Promise.all(SENSITIVE_CACHE_NAMES.map((name) => caches.delete(name)));
	} catch {
		// best-effort — ignore Cache Storage errors
	}
}

function SafeSerwistProvider({ children, swUrl }: SerwistProviderProps) {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) return;

		// When a newly deployed SW takes control while a tab is open
		// (skipWaiting + clientsClaim), reload once to pick up the fresh hashed
		// chunks and avoid ChunkLoadError mid-session (PWA-AUDIT-005).
		// Guard on an existing controller so the initial clientsClaim on the very
		// first visit (controller goes null -> active) does NOT trigger a reload.
		const hadController = Boolean(navigator.serviceWorker.controller);
		let refreshing = false;
		const onControllerChange = () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		};
		if (hadController) {
			navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
		}

		navigator.serviceWorker
			.register(swUrl, { type: "module", scope: "/" })
			.catch((err: unknown) => {
				console.warn("[SW] Registration failed:", err);
			});

		return () => {
			if (hadController) {
				navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
			}
		};
	}, [swUrl]);

	return children;
}

function PassThrough({ children }: { children: ReactNode }) {
	return children;
}

export const SerwistProvider =
	process.env.NODE_ENV === "production" ? SafeSerwistProvider : PassThrough;
