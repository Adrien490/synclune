import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Mock next/image to a plain <img>
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		sizes: _sizes,
		className,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		sizes?: string;
		className?: string;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} className={className} />
	),
}));

// Mock next/link to a plain <a>
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CachedProducts } from "../cached-products";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a minimal HTML string that mimics a cached product page.
 * Includes a <title> and an og:image meta tag.
 */
function buildProductHtml(title: string, ogImage?: string): string {
	const metaTag = ogImage ? `<meta property="og:image" content="${ogImage}" />` : "";
	return `<html><head><title>${title}</title>${metaTag}</head><body></body></html>`;
}

/**
 * Create a mock Cache object with the given entries.
 * Each entry maps a request URL to an HTML string.
 */
function buildMockCache(entries: Record<string, string>) {
	const requests = Object.keys(entries).map((url) => ({ url }) as Request);

	return {
		keys: vi.fn().mockResolvedValue(requests),
		match: vi.fn().mockImplementation(async (request: { url: string }) => {
			const html = entries[request.url];
			if (html === undefined) return undefined;
			return { text: vi.fn().mockResolvedValue(html) };
		}),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("CachedProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(cleanup);

	// --------------------------------------------------------------------------
	// Loading state
	// --------------------------------------------------------------------------

	describe("loading skeleton", () => {
		it("renders pulse skeleton divs while cache is loading", () => {
			// Keep the cache promise pending so the component stays in loading state
			const pendingCache = {
				keys: vi.fn().mockReturnValue(new Promise(() => {})),
				match: vi.fn(),
			};
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(pendingCache) },
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			// The skeleton renders animated pulse divs; verify at least one is present
			const pulsingEls = container.querySelectorAll(".motion-safe\\:animate-pulse");
			expect(pulsingEls.length).toBeGreaterThan(0);

			// The products section must not yet be visible
			expect(screen.queryByRole("region")).toBeNull();
		});

		it("renders exactly 2 skeleton product placeholders", () => {
			const pendingCache = {
				keys: vi.fn().mockReturnValue(new Promise(() => {})),
				match: vi.fn(),
			};
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(pendingCache) },
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			// The skeleton grid contains 2 aspect-square skeleton blocks
			const skeletonItems = container.querySelectorAll(".aspect-square.rounded-lg");
			expect(skeletonItems).toHaveLength(2);
		});
	});

	// --------------------------------------------------------------------------
	// Empty state
	// --------------------------------------------------------------------------

	describe("empty state", () => {
		it("renders nothing when the product-pages cache is empty", async () => {
			const emptyCache = buildMockCache({});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(emptyCache) },
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			expect(container.firstChild).toBeNull();
		});

		it("renders nothing when all cached entries fail to parse (no title)", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague": "<html><head></head></html>",
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			expect(container.firstChild).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Cache API unavailable
	// --------------------------------------------------------------------------

	describe("Cache API unavailable", () => {
		it("renders nothing when window.caches is not defined", async () => {
			// Remove caches from window
			const originalCaches = window.caches;
			Object.defineProperty(window, "caches", {
				value: undefined,
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			expect(container.firstChild).toBeNull();

			// Restore
			Object.defineProperty(window, "caches", {
				value: originalCaches,
				writable: true,
				configurable: true,
			});
		});

		it("renders nothing and does not throw when Cache API throws", async () => {
			Object.defineProperty(window, "caches", {
				value: {
					open: vi.fn().mockRejectedValue(new Error("SecurityError: cache unavailable")),
				},
				writable: true,
				configurable: true,
			});

			const { container } = render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			expect(container.firstChild).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Rendering cached products
	// --------------------------------------------------------------------------

	describe("rendering cached products", () => {
		it("renders the section with aria-label when products are cached", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml(
					"Bague Lune | Synclune",
					"https://cdn.example.com/bague-lune.jpg",
				),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			const section = screen.getByRole("region", {
				name: "Créations disponibles hors ligne",
			});
			expect(section).toBeInTheDocument();
		});

		it("renders a link for each cached product", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml(
					"Bague Lune | Synclune",
					"https://cdn.example.com/bague-lune.jpg",
				),
				"https://example.com/creations/collier-or": buildProductHtml(
					"Collier Or | Synclune",
					"https://cdn.example.com/collier-or.jpg",
				),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(2);
		});

		it("renders the product image when og:image is present", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml(
					"Bague Lune | Synclune",
					"https://cdn.example.com/bague-lune.jpg",
				),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			const img = screen.getByRole("img", { name: "Bague Lune" });
			expect(img).toBeInTheDocument();
			expect((img as HTMLImageElement).src).toContain("bague-lune.jpg");
		});

		it("renders diamond emoji placeholder when no og:image is present", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml("Bague Lune | Synclune"),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			// The fallback emoji span is aria-hidden
			const emoji = screen.getByText("💎");
			expect(emoji).toBeInTheDocument();
			expect(emoji).toHaveAttribute("aria-hidden", "true");

			// No img element should be rendered
			expect(screen.queryByRole("img")).toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Title parsing — strip "| Synclune" suffix
	// --------------------------------------------------------------------------

	describe("title parsing", () => {
		const titleCases: Array<{ raw: string; expected: string }> = [
			{ raw: "Bague Lune | Synclune", expected: "Bague Lune" },
			{ raw: "Bague Lune – Synclune", expected: "Bague Lune" },
			{ raw: "Bague Lune — Synclune", expected: "Bague Lune" },
			{ raw: "Bague Lune - Synclune", expected: "Bague Lune" },
			{ raw: "Bague Lune | Synclune Extra", expected: "Bague Lune" },
			{ raw: "Bague Lune", expected: "Bague Lune" },
		];

		for (const { raw, expected } of titleCases) {
			it(`strips suffix from "${raw}" → "${expected}"`, async () => {
				const cache = buildMockCache({
					"https://example.com/creations/bague-lune": buildProductHtml(raw),
				});
				Object.defineProperty(window, "caches", {
					value: { open: vi.fn().mockResolvedValue(cache) },
					writable: true,
					configurable: true,
				});

				render(<CachedProducts />);

				await act(async () => {
					await Promise.resolve();
				});

				expect(screen.getByText(expected)).toBeInTheDocument();

				cleanup();
			});
		}
	});

	// --------------------------------------------------------------------------
	// og:image extraction
	// --------------------------------------------------------------------------

	describe("og:image extraction", () => {
		it("extracts og:image from single-quoted content attribute", async () => {
			const html = `<html><head><title>Bracelet Argent | Synclune</title><meta property='og:image' content='https://cdn.example.com/bracelet.jpg' /></head></html>`;
			const cache = buildMockCache({
				"https://example.com/creations/bracelet-argent": html,
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			const img = screen.getByRole("img", { name: "Bracelet Argent" });
			expect((img as HTMLImageElement).src).toContain("bracelet.jpg");
		});

		it("uses pathname from request URL as the link href", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml("Bague Lune | Synclune"),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/creations/bague-lune");
		});
	});

	// --------------------------------------------------------------------------
	// Graceful failure
	// --------------------------------------------------------------------------

	describe("graceful failure", () => {
		it("skips entries where cache.match returns null and renders the rest", async () => {
			const requests = [
				{ url: "https://example.com/creations/bague-lune" },
				{ url: "https://example.com/creations/collier-or" },
			] as Request[];

			const brokenCache = {
				keys: vi.fn().mockResolvedValue(requests),
				match: vi.fn().mockImplementation(async (request: { url: string }) => {
					if (request.url.includes("bague-lune")) return null;
					return { text: vi.fn().mockResolvedValue(buildProductHtml("Collier Or | Synclune")) };
				}),
			};

			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(brokenCache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			// Only the successfully parsed product should appear
			expect(screen.getByText("Collier Or")).toBeInTheDocument();
			expect(screen.getAllByRole("link")).toHaveLength(1);
		});

		it("renders the section heading", async () => {
			const cache = buildMockCache({
				"https://example.com/creations/bague-lune": buildProductHtml(
					"Bague Lune | Synclune",
					"https://cdn.example.com/bague-lune.jpg",
				),
			});
			Object.defineProperty(window, "caches", {
				value: { open: vi.fn().mockResolvedValue(cache) },
				writable: true,
				configurable: true,
			});

			render(<CachedProducts />);

			await act(async () => {
				await Promise.resolve();
			});

			expect(
				screen.getByRole("heading", { name: "Créations disponibles hors ligne" }),
			).toBeInTheDocument();
		});
	});
});
