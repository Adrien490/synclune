import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

// NOTE: vi.mock factories are hoisted to the top of the file by Vitest, so
// no top-level variables are accessible inside them. The URL must be a literal.
vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.fr",
	getOrganizationSchema: vi.fn(() => ({
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": "https://synclune.fr/#organization",
		name: "Synclune",
	})),
	getWebSiteSchema: vi.fn(() => ({
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": "https://synclune.fr/#website",
		url: "https://synclune.fr",
	})),
	getLocalBusinessSchema: vi.fn((reviewStats) => {
		const base = {
			"@context": "https://schema.org",
			"@type": "LocalBusiness",
			"@id": "https://synclune.fr/#local-business",
			name: "Synclune",
		};
		if (reviewStats?.totalReviews > 0) {
			return {
				...base,
				aggregateRating: {
					"@type": "AggregateRating",
					ratingValue: reviewStats.averageRating,
					reviewCount: reviewStats.totalReviews,
				},
			};
		}
		return base;
	}),
	getFounderSchema: vi.fn(() => ({
		"@context": "https://schema.org",
		"@type": "Person",
		"@id": "https://synclune.fr/#founder",
		name: "Léane",
	})),
}));

// Pré-lancement, ORDERS_AVAILABLE === false force toutes les Offer JSON-LD à
// OutOfStock via getOfferAvailability. On force le flag à true ici pour tester
// la logique stock (comportement stable au go-live) ; le gating pré-lancement
// est verrouillé par shared/utils/__tests__/offer-availability.test.ts.
vi.mock("@/shared/constants/orders-availability", async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	ORDERS_AVAILABLE: true,
}));

// Alias used throughout the test file for readable assertions
const SITE_URL = "https://synclune.fr";

// Import AFTER mocks
import { StructuredData } from "../structured-data";
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";
import type { Product } from "@/modules/products/types/product.types";
import type { GlobalReviewStats } from "@/shared/constants/seo-config";

// ============================================================================
// HELPERS
// ============================================================================

function getScriptData(): Record<string, unknown> {
	const script = document.querySelector('script[type="application/ld+json"]');
	if (!script?.textContent) throw new Error("script tag not found");
	return JSON.parse(script.textContent) as Record<string, unknown>;
}

function buildReviewStats(overrides: Partial<GlobalReviewStats> = {}): GlobalReviewStats {
	return { totalReviews: 42, averageRating: 4.8, ...overrides };
}

type FeaturedProductOverrides = {
	slug?: string;
	title?: string;
	description?: string | null;
	priceInclTax?: number;
	inventory?: number;
	primaryImageUrl?: string;
	reviewStats?: { averageRating: number; totalCount: number } | null;
	skipPrice?: boolean;
};

function buildFeaturedProduct(overrides: FeaturedProductOverrides = {}): Product {
	const {
		slug = "bague-lune",
		title = "Bague Lune",
		description = "Bague artisanale en argent",
		priceInclTax = 4500,
		inventory = 3,
		primaryImageUrl = "https://cdn.synclune.fr/bague-lune-primary.webp",
		reviewStats = { averageRating: 4.8, totalCount: 12 },
		skipPrice = false,
	} = overrides;

	const skus = skipPrice
		? []
		: [
				{
					id: "sku-1",
					sku: "BL-001",
					priceInclTax,
					compareAtPrice: null,
					inventory,
					isActive: true,
					isDefault: true,
					images: [
						{
							id: "img-1",
							url: primaryImageUrl,
							thumbnailUrl: null,
							blurDataUrl: null,
							altText: title,
							mediaType: "IMAGE" as const,
							isPrimary: true,
						},
					],
					material: null,
					color: null,
					size: null,
				},
			];

	return {
		id: "product-1",
		slug,
		title,
		description,
		type: { id: "type-1", slug: "bague", label: "Bague", isActive: true },
		status: "PUBLIC",
		createdAt: new Date(),
		updatedAt: new Date(),
		reviewStats,
		skus,
		_count: { skus: skus.length },
		collections: [],
	} as unknown as Product;
}

function buildReview(overrides: Partial<ReviewHomepage> = {}): ReviewHomepage {
	return {
		id: "review-1",
		rating: 5,
		title: "Magnifique bijou",
		content: "Vraiment superbe, je recommande.",
		createdAt: new Date("2025-06-01T12:00:00Z"),
		user: { name: "Marie Dupont", image: null },
		medias: [],
		response: null,
		product: {
			title: "Bague Lune",
			slug: "bague-lune",
			skus: [],
		},
		...overrides,
	};
}

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

beforeEach(() => {
	// Remove any leftover script tags between tests
	document.querySelectorAll('script[type="application/ld+json"]').forEach((el) => el.remove());
});

// ============================================================================
// TESTS
// ============================================================================

describe("StructuredData", () => {
	describe("script tag output", () => {
		it("renders a script tag with type application/ld+json", () => {
			render(<StructuredData reviewStats={buildReviewStats()} />);

			const script = document.querySelector('script[type="application/ld+json"]');
			expect(script).not.toBeNull();
		});

		it("outputs a top-level @context of https://schema.org", () => {
			render(<StructuredData reviewStats={buildReviewStats()} />);

			const data = getScriptData();
			expect(data["@context"]).toBe("https://schema.org");
		});
	});

	describe("base schemas (always rendered)", () => {
		it("includes Organization, WebSite, LocalBusiness and Person in @graph", () => {
			render(<StructuredData reviewStats={buildReviewStats()} />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const types = graph.map((s) => s["@type"]);

			expect(types).toContain("Organization");
			expect(types).toContain("WebSite");
			expect(types).toContain("LocalBusiness");
			expect(types).toContain("Person");
		});

		it("renders exactly 4 schemas when includeHomepageSchemas is not set", () => {
			render(<StructuredData reviewStats={buildReviewStats()} />);

			const data = getScriptData();
			const graph = data["@graph"] as unknown[];
			expect(graph).toHaveLength(4);
		});

		it("strips @context from individual schemas inside @graph", () => {
			render(<StructuredData reviewStats={buildReviewStats()} />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			for (const schema of graph) {
				expect(schema).not.toHaveProperty("@context");
			}
		});
	});

	describe("homepage schemas", () => {
		it("adds BreadcrumbList and Article when includeHomepageSchemas is true (6 schemas total)", () => {
			render(<StructuredData reviewStats={buildReviewStats()} includeHomepageSchemas />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const types = graph.map((s) => s["@type"]);

			expect(types).toContain("BreadcrumbList");
			expect(types).toContain("Article");
			expect(graph).toHaveLength(6);
		});

		it("adds Review schemas when includeHomepageSchemas is true and featuredReviews are provided", () => {
			const reviews = [buildReview(), buildReview({ id: "review-2", title: null })];
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={reviews}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const reviewSchemas = graph.filter((s) => s["@type"] === "Review");

			// 4 base + 2 homepage (BreadcrumbList + Article) + 2 reviews
			expect(graph).toHaveLength(8);
			expect(reviewSchemas).toHaveLength(2);
		});

		it("does not add Review schemas when featuredReviews is not provided", () => {
			render(<StructuredData reviewStats={buildReviewStats()} includeHomepageSchemas />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const reviewSchemas = graph.filter((s) => s["@type"] === "Review");

			expect(reviewSchemas).toHaveLength(0);
		});
	});

	describe("aggregateRating", () => {
		it("includes aggregateRating on LocalBusiness when totalReviews > 0", () => {
			render(<StructuredData reviewStats={{ totalReviews: 10, averageRating: 4.5 }} />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const localBusiness = graph.find((s) => s["@type"] === "LocalBusiness");

			expect(localBusiness).toHaveProperty("aggregateRating");
		});

		it("omits aggregateRating on LocalBusiness when totalReviews is 0", () => {
			render(<StructuredData reviewStats={{ totalReviews: 0, averageRating: 0 }} />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const localBusiness = graph.find((s) => s["@type"] === "LocalBusiness");

			expect(localBusiness).not.toHaveProperty("aggregateRating");
		});
	});

	describe("@id cross-referencing", () => {
		it("Article author references #founder @id", () => {
			render(<StructuredData reviewStats={buildReviewStats()} includeHomepageSchemas />);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const article = graph.find((s) => s["@type"] === "Article") as Record<string, unknown>;
			const author = article["author"] as Record<string, unknown>;

			expect(author["@id"]).toBe(`${SITE_URL}/#founder`);
		});

		it("Review publisher references #organization @id", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[buildReview()]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const review = graph.find((s) => s["@type"] === "Review") as Record<string, unknown>;
			const publisher = review["publisher"] as Record<string, unknown>;

			expect(publisher["@id"]).toBe(`${SITE_URL}/#organization`);
		});

		it("Review schemas use sequential @id values (#review-0, #review-1, ...)", () => {
			const reviews = [buildReview(), buildReview({ id: "review-2" })];
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={reviews}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const reviewSchemas = graph.filter((s) => s["@type"] === "Review");

			expect(reviewSchemas[0]?.["@id"]).toBe(`${SITE_URL}/#review-0`);
			expect(reviewSchemas[1]?.["@id"]).toBe(`${SITE_URL}/#review-1`);
		});
	});

	describe("XSS protection via safeJsonLd", () => {
		it("does not contain raw < or > characters in the script content", () => {
			// The review content contains characters that safeJsonLd must escape
			const maliciousReview = buildReview({
				content: "</script><script>alert('xss')</script>",
			});

			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[maliciousReview]}
				/>,
			);

			const script = document.querySelector('script[type="application/ld+json"]');
			const raw = script?.textContent ?? "";

			expect(raw).not.toMatch(/</);
			expect(raw).not.toMatch(/>/);
		});

		it("produces valid JSON after escaping (can be parsed back)", () => {
			const reviewWithSpecialChars = buildReview({
				content: "Bijou <3 & vraiment > mes attentes",
			});

			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[reviewWithSpecialChars]}
				/>,
			);

			const script = document.querySelector('script[type="application/ld+json"]');
			// JSON.parse should not throw
			expect(() => JSON.parse(script?.textContent ?? "")).not.toThrow();
		});
	});

	describe("Review author name", () => {
		it("uses user.name when present", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[buildReview({ user: { name: "Claire Martin", image: null } })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const review = graph.find((s) => s["@type"] === "Review") as Record<string, unknown>;
			const author = review["author"] as Record<string, unknown>;

			expect(author["name"]).toBe("Claire Martin");
		});

		it("falls back to 'Anonyme' when user.name is null", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[buildReview({ user: { name: null, image: null } })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const review = graph.find((s) => s["@type"] === "Review") as Record<string, unknown>;
			const author = review["author"] as Record<string, unknown>;

			expect(author["name"]).toBe("Anonyme");
		});
	});

	describe("ItemList featuredProducts (Offer schema)", () => {
		it("omits ItemList when featuredProducts is empty", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			expect(graph.find((s) => s["@type"] === "ItemList")).toBeUndefined();
		});

		it("adds ItemList with Product items wrapping Offer when featuredProducts are provided", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[buildFeaturedProduct()]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;

			expect(itemList).toBeDefined();
			expect(itemList["numberOfItems"]).toBe(1);

			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			expect(elements).toHaveLength(1);

			const first = elements[0] as Record<string, unknown>;
			expect(first["@type"]).toBe("ListItem");
			expect(first["position"]).toBe(1);
			expect(first["url"]).toBe(`${SITE_URL}/creations/bague-lune`);

			const productNode = first["item"] as Record<string, unknown>;
			expect(productNode["@type"]).toBe("Product");
			expect(productNode["@id"]).toBe(`${SITE_URL}/creations/bague-lune#product`);
			expect(productNode["name"]).toBe("Bague Lune");
			expect(productNode["url"]).toBe(`${SITE_URL}/creations/bague-lune`);
			expect(productNode["image"]).toBe("https://cdn.synclune.fr/bague-lune-primary.webp");
			expect(productNode["description"]).toBe("Bague artisanale en argent");
		});

		it("emits an Offer with EUR currency, formatted price and InStock when inventory > 0", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[buildFeaturedProduct({ priceInclTax: 4500, inventory: 5 })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;
			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			const productNode = (elements[0] as Record<string, unknown>)["item"] as Record<
				string,
				unknown
			>;
			const offer = productNode["offers"] as Record<string, unknown>;

			expect(offer["@type"]).toBe("Offer");
			expect(offer["price"]).toBe("45.00");
			expect(offer["priceCurrency"]).toBe("EUR");
			expect(offer["availability"]).toBe("https://schema.org/InStock");
			expect(offer["itemCondition"]).toBe("https://schema.org/NewCondition");
			expect(offer["url"]).toBe(`${SITE_URL}/creations/bague-lune`);
		});

		it("emits OutOfStock availability when inventory is 0", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[buildFeaturedProduct({ inventory: 0 })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;
			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			const productNode = (elements[0] as Record<string, unknown>)["item"] as Record<
				string,
				unknown
			>;
			const offer = productNode["offers"] as Record<string, unknown>;

			expect(offer["availability"]).toBe("https://schema.org/OutOfStock");
		});

		it("omits Offer entirely when no SKU is available (priceInclTax undefined)", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[buildFeaturedProduct({ skipPrice: true })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;
			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			const productNode = (elements[0] as Record<string, unknown>)["item"] as Record<
				string,
				unknown
			>;

			expect(productNode).not.toHaveProperty("offers");
		});

		it("includes aggregateRating on Product when product has reviews", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[
						buildFeaturedProduct({ reviewStats: { averageRating: 4.5, totalCount: 8 } }),
					]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;
			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			const productNode = (elements[0] as Record<string, unknown>)["item"] as Record<
				string,
				unknown
			>;
			const aggregate = productNode["aggregateRating"] as Record<string, unknown>;

			expect(aggregate["@type"]).toBe("AggregateRating");
			expect(aggregate["ratingValue"]).toBe(4.5);
			expect(aggregate["reviewCount"]).toBe(8);
		});

		it("omits aggregateRating on Product when product has zero reviews", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredProducts={[
						buildFeaturedProduct({ reviewStats: { averageRating: 0, totalCount: 0 } }),
					]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const itemList = graph.find((s) => s["@type"] === "ItemList") as Record<string, unknown>;
			const elements = itemList["itemListElement"] as Array<Record<string, unknown>>;
			const productNode = (elements[0] as Record<string, unknown>)["item"] as Record<
				string,
				unknown
			>;

			expect(productNode).not.toHaveProperty("aggregateRating");
		});
	});

	describe("Review name field (title)", () => {
		it("includes name field when review has a title", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[buildReview({ title: "Superbe qualité" })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const review = graph.find((s) => s["@type"] === "Review") as Record<string, unknown>;

			expect(review["name"]).toBe("Superbe qualité");
		});

		it("omits name field when review title is null", () => {
			render(
				<StructuredData
					reviewStats={buildReviewStats()}
					includeHomepageSchemas
					featuredReviews={[buildReview({ title: null })]}
				/>,
			);

			const data = getScriptData();
			const graph = data["@graph"] as Array<Record<string, unknown>>;
			const review = graph.find((s) => s["@type"] === "Review") as Record<string, unknown>;

			expect(review).not.toHaveProperty("name");
		});
	});
});
