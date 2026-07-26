import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetSitemapProducts, mockLoggerError, mockLoggerWarn } = vi.hoisted(() => ({
	mockGetSitemapProducts: vi.fn(),
	mockLoggerError: vi.fn(),
	mockLoggerWarn: vi.fn(),
}));

vi.mock("@/modules/products/data/get-sitemap-products", () => ({
	getSitemapProducts: mockGetSitemapProducts,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError, warn: mockLoggerWarn },
}));

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.test",
}));

import { GET } from "../route";

// ============================================================================
// HELPERS
// ============================================================================

function makeProduct(overrides: Record<string, unknown> = {}) {
	return {
		slug: "bracelet-lune",
		title: "Bracelet Lune",
		updatedAt: new Date("2026-07-01T10:00:00.000Z"),
		type: { label: "Bracelet" },
		skus: [
			{
				images: [
					{ url: "https://cdn.test/a.jpg", altText: "Vue de face", isPrimary: true },
					{ url: "https://cdn.test/b.jpg", altText: null, isPrimary: false },
				],
			},
		],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("GET /sitemap-images.xml", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockGetSitemapProducts.mockResolvedValue([]);
	});

	// ─── Extension Google Image ──────────────────────────────────────────────

	it("emits the image namespace and the three image tags", async () => {
		mockGetSitemapProducts.mockResolvedValue([makeProduct()]);

		const xml = await (await GET()).text();

		expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
		expect(xml).toContain("<image:loc>https://cdn.test/a.jpg</image:loc>");
		expect(xml).toContain("<image:caption>Vue de face</image:caption>");
		expect(xml).toContain("<image:title>Bracelet Lune</image:title>");
	});

	it("builds the canonical <loc> and a <lastmod> from updatedAt", async () => {
		mockGetSitemapProducts.mockResolvedValue([makeProduct()]);

		const xml = await (await GET()).text();

		expect(xml).toContain("<loc>https://synclune.test/creations/bracelet-lune</loc>");
		expect(xml).toContain("<lastmod>2026-07-01T10:00:00.000Z</lastmod>");
	});

	it("falls back to a descriptive caption when altText is null", async () => {
		mockGetSitemapProducts.mockResolvedValue([makeProduct()]);

		const xml = await (await GET()).text();

		expect(xml).toContain(
			"<image:caption>Bracelet Lune - Bracelet fait main Synclune</image:caption>",
		);
	});

	it("uses a generic type label when the product has no type", async () => {
		mockGetSitemapProducts.mockResolvedValue([
			makeProduct({
				type: null,
				skus: [{ images: [{ url: "https://cdn.test/x.jpg", altText: null, isPrimary: true }] }],
			}),
		]);

		const xml = await (await GET()).text();

		expect(xml).toContain("Bijou artisanal fait main Synclune");
	});

	// ─── Déduplication ───────────────────────────────────────────────────────

	it("deduplicates the same image URL across SKUs of one product", async () => {
		mockGetSitemapProducts.mockResolvedValue([
			makeProduct({
				skus: [
					{ images: [{ url: "https://cdn.test/dup.jpg", altText: "A", isPrimary: true }] },
					{ images: [{ url: "https://cdn.test/dup.jpg", altText: "B", isPrimary: false }] },
				],
			}),
		]);

		const xml = await (await GET()).text();

		expect(xml.match(/<image:loc>/g)).toHaveLength(1);
		// La PREMIÈRE occurrence gagne (donc l'alt du SKU primaire).
		expect(xml).toContain("<image:caption>A</image:caption>");
	});

	it("skips products with no images", async () => {
		mockGetSitemapProducts.mockResolvedValue([makeProduct({ skus: [{ images: [] }] })]);

		const xml = await (await GET()).text();

		expect(xml).not.toContain("<url>");
	});

	// ─── Échappement XML ─────────────────────────────────────────────────────

	it("escapes XML special characters in the caption AND in the <loc>", async () => {
		mockGetSitemapProducts.mockResolvedValue([
			makeProduct({
				slug: "bague-r&d",
				title: 'Bague "R&D" <test>',
				skus: [
					{
						images: [
							{ url: "https://cdn.test/i.jpg?a=1&b=2", altText: "Vue 1 & 2", isPrimary: true },
						],
					},
				],
			}),
		]);

		const xml = await (await GET()).text();

		expect(xml).toContain("<loc>https://synclune.test/creations/bague-r&amp;d</loc>");
		expect(xml).toContain("<image:loc>https://cdn.test/i.jpg?a=1&amp;b=2</image:loc>");
		expect(xml).toContain("<image:caption>Vue 1 &amp; 2</image:caption>");
		expect(xml).toContain("<image:title>Bague &quot;R&amp;D&quot; &lt;test&gt;</image:title>");
		// Aucun `&` nu ne doit subsister (XML invalide → sitemap rejeté).
		expect(xml).not.toMatch(/&(?!amp;|quot;|apos;|lt;|gt;)/);
	});

	// ─── Plafond Google (1000 images / <url>) ────────────────────────────────

	it("caps images at 1000 per <url> and logs the truncation", async () => {
		const images = Array.from({ length: 1200 }, (_, i) => ({
			url: `https://cdn.test/${i}.jpg`,
			altText: `img ${i}`,
			isPrimary: i === 0,
		}));
		mockGetSitemapProducts.mockResolvedValue([makeProduct({ skus: [{ images }] })]);

		const xml = await (await GET()).text();

		expect(xml.match(/<image:loc>/g)).toHaveLength(1000);
		// Troncature jamais silencieuse.
		expect(mockLoggerWarn).toHaveBeenCalledWith(
			expect.stringContaining("tronqué"),
			expect.anything(),
		);
	});

	// ─── Résilience ──────────────────────────────────────────────────────────

	it("returns 503 + no-store when the catalogue read fails", async () => {
		// Un <urlset> vide serait caché 24 h par le CDN → désindexation silencieuse.
		mockGetSitemapProducts.mockRejectedValue(new Error("connection reset"));

		const response = await GET();

		expect(response.status).toBe(503);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(mockLoggerError).toHaveBeenCalled();
	});

	it("serves a valid empty urlset (cached) when the catalogue is genuinely empty", async () => {
		mockGetSitemapProducts.mockResolvedValue([]);

		const response = await GET();
		const xml = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, s-maxage=86400");
		expect(response.headers.get("Content-Type")).toBe("application/xml");
		expect(xml).toContain("<urlset");
		expect(xml).not.toContain("<url>");
	});
});
