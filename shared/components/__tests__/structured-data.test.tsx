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

// Alias used throughout the test file for readable assertions
const SITE_URL = "https://synclune.fr";

// Import AFTER mocks
import { StructuredData } from "../structured-data";
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";
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
