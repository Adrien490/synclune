"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CachedProduct {
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

/**
 * Displays product pages cached by the service worker.
 * Reads from the "product-pages" cache and extracts title + og:image from HTML.
 */
export function CachedProducts() {
	const [products, setProducts] = useState<CachedProduct[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function loadCachedProducts() {
			try {
				if (!("caches" in window)) {
					setLoading(false);
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

				setProducts(results.filter((p): p is CachedProduct => p !== null));
				setLoading(false);
			} catch {
				// Cache API not available or failed
				setLoading(false);
			}
		}

		void loadCachedProducts();
	}, []);

	if (loading) {
		return (
			<div className="mt-12 space-y-4">
				<div className="bg-muted mx-auto h-6 w-64 rounded motion-safe:animate-pulse" />
				<div className="mx-auto grid max-w-md grid-cols-2 gap-3">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className="bg-muted aspect-square rounded-lg motion-safe:animate-pulse" />
					))}
				</div>
			</div>
		);
	}

	if (products.length === 0) {
		return null;
	}

	return (
		<section className="mt-12 space-y-4" aria-label="Créations disponibles hors ligne">
			<h2 className="font-display text-foreground text-lg font-semibold">
				Créations disponibles hors ligne
			</h2>
			<div className="mx-auto grid max-w-md grid-cols-2 gap-3">
				{products.map((product) => (
					<Link
						key={product.url}
						href={product.url}
						className="group border-primary/10 bg-background/80 focus-visible:ring-ring/50 overflow-hidden rounded-lg border transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:outline-none"
					>
						{product.image ? (
							<div className="relative aspect-square">
								<Image
									src={product.image}
									alt={product.title}
									fill
									className="object-cover"
									sizes="(max-width: 448px) 50vw, 224px"
								/>
							</div>
						) : (
							<div className="bg-muted flex aspect-square items-center justify-center">
								<span className="text-3xl" aria-hidden="true">
									💎
								</span>
							</div>
						)}
						<p className="text-foreground line-clamp-2 p-2 text-center text-sm font-medium">
							{product.title}
						</p>
					</Link>
				))}
			</div>
		</section>
	);
}
