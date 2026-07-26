import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReviewHomepage } from "@/modules/reviews/types/review.types";

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			subtitle: { y: 15, delay: 0.1, duration: 0.4 },
		},
	},
}));

vi.mock("@/shared/components/rating-stars", () => ({
	RatingStars: ({ rating }: { rating: number }) => (
		<div data-testid="rating-stars" data-rating={rating} />
	),
}));

import { pickPullQuote } from "../pick-pull-quote";
import { ReviewsPullQuote } from "../reviews-pull-quote";

afterEach(() => {
	cleanup();
});

function makeReview(overrides: Partial<ReviewHomepage> = {}): ReviewHomepage {
	return {
		id: "r1",
		rating: 5,
		title: null,
		content: "Un bijou magnifique, les couleurs sont encore plus belles en vrai !",
		createdAt: new Date("2026-01-01"),
		user: { name: "Marie Dupont", image: null },
		medias: [],
		response: null,
		product: { title: "Boucles raisins", slug: "boucles-raisins", skus: [] },
		...overrides,
	} as unknown as ReviewHomepage;
}

describe("pickPullQuote", () => {
	it("retourne le premier avis 5 étoiles citable (40-140 chars)", () => {
		const short = makeReview({ id: "short", content: "Trop court." });
		const good = makeReview({ id: "good" });
		expect(pickPullQuote([short, good])?.id).toBe("good");
	});

	it("ignore les avis non 5 étoiles", () => {
		const fourStars = makeReview({ rating: 4 });
		expect(pickPullQuote([fourStars])).toBeNull();
	});

	it("ignore les textes trop longs (> 140)", () => {
		const long = makeReview({ content: "a".repeat(141) });
		expect(pickPullQuote([long])).toBeNull();
	});

	it("accepte les bornes exactes 40 et 140", () => {
		expect(pickPullQuote([makeReview({ content: "a".repeat(40) })])).not.toBeNull();
		expect(pickPullQuote([makeReview({ content: "a".repeat(140) })])).not.toBeNull();
	});

	it("retourne null sur une liste vide", () => {
		expect(pickPullQuote([])).toBeNull();
	});
});

describe("ReviewsPullQuote", () => {
	it("rend la citation dans un blockquote font-cursive avec le prénom seul", () => {
		render(<ReviewsPullQuote review={makeReview()} />);

		const blockquote = document.querySelector("blockquote");
		expect(blockquote).not.toBeNull();
		expect(blockquote!.className).toContain("font-cursive");
		// Sacramento mono-poids déjà inclinée : jamais bold/italic
		expect(blockquote!.className).not.toMatch(/\bitalic\b|font-bold/);
		expect(blockquote!.textContent).toContain("Un bijou magnifique");
		expect(screen.getByText("Marie")).toBeInTheDocument();
		expect(screen.queryByText("Marie Dupont")).not.toBeInTheDocument();
	});

	it("sans nom utilisateur : étoiles seules, aucune attribution inventée", () => {
		render(<ReviewsPullQuote review={makeReview({ user: { name: null, image: null } })} />);

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		const figcaption = document.querySelector("figcaption");
		expect(figcaption!.querySelectorAll("span")).toHaveLength(0);
	});

	it("guillemets décoratifs aria-hidden teintés section-accent", () => {
		render(<ReviewsPullQuote review={makeReview()} />);

		const decorative = document.querySelectorAll('blockquote span[aria-hidden="true"]');
		expect(decorative).toHaveLength(2);
	});
});
