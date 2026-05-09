"use client";

import { useEffect, useState } from "react";

export interface CachedProduct {
	url: string;
	title: string;
	image: string | null;
}

/** Extracts product data (title, og:image) from cached HTML page. */
function parseCachedProductFromHtml(html: string, requestUrl: string): CachedProduct | null {
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	const rawTitle = titleMatch?.[1] ?? "";
	const title = rawTitle.replace(/\s*[|–—-]\s*Synclune.*$/i, "").trim();

	const ogImageMatch = html.match(
		/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
	);
	const image = ogImageMatch?.[1] ?? null;

	if (title) {
		const pathname = new URL(requestUrl).pathname;
		return { url: pathname, title, image };
	}
	return null;
}

interface CachedProductsState {
	products: CachedProduct[];
	loading: boolean;
}

/**
 * Reads the service-worker "product-pages" cache and extracts title + og:image
 * from each cached HTML response. Cancellation-safe to avoid setState after unmount.
 */
export function useCachedProducts(): CachedProductsState {
	const [state, setState] = useState<CachedProductsState>({ products: [], loading: true });

	useEffect(() => {
		let cancelled = false;

		void (async () => {
			try {
				if (!("caches" in window)) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by cleanup
					if (!cancelled) setState({ products: [], loading: false });
					return;
				}

				const cache = await caches.open("product-pages");
				const keys = await cache.keys();

				const results = await Promise.all(
					keys.map(async (request): Promise<CachedProduct | null> => {
						const response = await cache.match(request);
						if (!response) return null;
						const html = await response.text();
						return parseCachedProductFromHtml(html, request.url);
					}),
				);

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by cleanup
				if (cancelled) return;
				setState({
					products: results.filter((p): p is CachedProduct => p !== null),
					loading: false,
				});
			} catch {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by cleanup
				if (!cancelled) setState({ products: [], loading: false });
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}
