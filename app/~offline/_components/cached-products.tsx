"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

interface CachedProduct {
	url: string
	title: string
	image: string | null
}

/**
 * Displays product pages cached by the service worker.
 * Reads from the "product-pages" cache and extracts title + og:image from HTML.
 */
export function CachedProducts() {
	const [products, setProducts] = useState<CachedProduct[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function loadCachedProducts() {
			try {
				if (!("caches" in window)) {
					setLoading(false)
					return
				}

				const cache = await caches.open("product-pages")
				const keys = await cache.keys()

				const results = await Promise.all(
					keys.map(async (request): Promise<CachedProduct | null> => {
						try {
							const response = await cache.match(request)
							if (!response) return null

							const html = await response.text()

							// Extract title from <title> tag
							const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
							const rawTitle = titleMatch?.[1] ?? ""
							// Remove " | Synclune" or similar suffix
							const title = rawTitle.replace(/\s*[|–—-]\s*Synclune.*$/i, "").trim()

							// Extract og:image from meta tag
							const ogImageMatch = html.match(
								/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
							)
							const image = ogImageMatch?.[1] ?? null

							if (title) {
								const pathname = new URL(request.url).pathname
								return { url: pathname, title, image }
							}
							return null
						} catch {
							return null
						}
					})
				)

				setProducts(results.filter((p): p is CachedProduct => p !== null))
			} catch {
				// Cache API not available or failed
			} finally {
				setLoading(false)
			}
		}

		loadCachedProducts()
	}, [])

	if (loading) {
		return (
			<div className="mt-12 space-y-4">
				<div className="h-6 w-64 mx-auto bg-muted animate-pulse rounded" />
				<div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
					{Array.from({ length: 2 }).map((_, i) => (
						<div
							key={i}
							className="aspect-square bg-muted animate-pulse rounded-lg"
						/>
					))}
				</div>
			</div>
		)
	}

	if (products.length === 0) {
		return null
	}

	return (
		<section className="mt-12 space-y-4" aria-label="Créations disponibles hors ligne">
			<h2 className="text-lg font-display font-semibold text-foreground">
				Créations disponibles hors ligne
			</h2>
			<div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
				{products.map((product) => (
					<Link
						key={product.url}
						href={product.url}
						className="group rounded-lg border border-primary/10 bg-background/80 overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
							<div className="aspect-square bg-muted flex items-center justify-center">
								<span className="text-3xl" aria-hidden="true">
									💎
								</span>
							</div>
						)}
						<p className="p-2 text-sm font-medium text-foreground line-clamp-2 text-center">
							{product.title}
						</p>
					</Link>
				))}
			</div>
		</section>
	)
}
