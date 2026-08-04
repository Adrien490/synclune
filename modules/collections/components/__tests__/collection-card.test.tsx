import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number, _opts?: unknown) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("../collection-images-grid", () => ({
	CollectionImagesGrid: ({
		collectionName,
		images,
		framed,
	}: {
		images: unknown[];
		collectionName: string;
		isAboveFold?: boolean;
		framed?: boolean;
	}) => (
		<div
			data-testid="collection-images-grid"
			data-collection={collectionName}
			data-framed={framed ? "true" : "false"}
		>
			{images.length} images
		</div>
	),
}));

vi.mock("@/modules/collections/constants/image-sizes.constants", () => ({
	ABOVE_FOLD_THRESHOLD: 4,
}));

vi.mock("@/shared/components/placeholder-image", () => ({
	PlaceholderImage: ({ className, label }: { className?: string; label?: string }) => (
		<div data-testid="placeholder-image" className={className} aria-label={label} role="img" />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionCard } from "../collection-card";
import type { CollectionImage } from "../../types/collection.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const mockImages: CollectionImage[] = [
	{ url: "https://example.com/img1.jpg", alt: "Image 1" },
	{ url: "https://example.com/img2.jpg", alt: "Image 2" },
];

function renderCard(overrides: Partial<React.ComponentProps<typeof CollectionCard>> = {}) {
	const props = {
		slug: "bagues-artisanales",
		name: "Bagues Artisanales",
		...overrides,
	};
	return render(<CollectionCard {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionCard", () => {
	it("renders the collection name as heading", () => {
		renderCard();
		expect(screen.getByRole("heading", { name: "Bagues Artisanales" })).toBeInTheDocument();
	});

	it("renders a link to the collection page", () => {
		renderCard();
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/collections/bagues-artisanales");
	});

	it("renders the images grid when images are provided", () => {
		renderCard({ images: mockImages });
		expect(screen.getByTestId("collection-images-grid")).toBeInTheDocument();
		expect(screen.getByTestId("collection-images-grid")).toHaveAttribute(
			"data-collection",
			"Bagues Artisanales",
		);
	});

	it("renders the shared placeholder when no images are provided", () => {
		renderCard({ images: [] });
		const placeholder = screen.getByTestId("placeholder-image");
		expect(placeholder).toBeInTheDocument();
		expect(placeholder).toHaveAttribute(
			"aria-label",
			expect.stringContaining("Bagues Artisanales"),
		);
	});

	it("renders product count in the eyebrow when provided and greater than zero", () => {
		renderCard({ productCount: 12 });
		expect(screen.getByText("Collection · 12 créations")).toBeInTheDocument();
	});

	it("renders singular 'création' when product count is 1", () => {
		renderCard({ productCount: 1 });
		expect(screen.getByText("Collection · 1 création")).toBeInTheDocument();
	});

	it("renders 'Bientôt' instead of a count when productCount is 0", () => {
		renderCard({ productCount: 0 });
		expect(screen.queryByText(/création/)).toBeNull();
		expect(screen.getByText("Collection · Bientôt")).toBeInTheDocument();
	});

	it("renders description text", () => {
		renderCard({ description: "Bijoux faits à la main" });
		expect(screen.getByText("Bijoux faits à la main")).toBeInTheDocument();
	});

	it("renders the minimum as a from-price when min and max differ", () => {
		renderCard({ priceRange: { min: 2000, max: 5000 } });
		// From-price framing: only the min is shown, the max is omitted.
		expect(screen.getByText("20.00 €")).toBeInTheDocument();
		expect(screen.queryByText("50.00 €")).toBeNull();
	});

	it("renders the price when min equals max", () => {
		renderCard({ priceRange: { min: 3000, max: 3000 } });
		expect(screen.getByText("30.00 €")).toBeInTheDocument();
	});

	it("renders h2 heading when headingLevel is 'h2'", () => {
		renderCard({ headingLevel: "h2" });
		expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
	});

	it("uses h3 as the default heading level", () => {
		renderCard();
		expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
	});

	it("wraps content in an article element", () => {
		const { container } = renderCard();
		expect(container.querySelector("article")).not.toBeNull();
	});

	describe("stretched-link pattern (P1.4)", () => {
		it("link aria-label matches the collection name (clean SR announcement)", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link).toBeInTheDocument();
			expect(link.getAttribute("href")).toBe("/collections/bagues-artisanales");
		});

		it("link has after:inset-0 + after:z-10 classes to cover the whole article", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link.className).toMatch(/after:inset-0/);
			expect(link.className).toMatch(/after:z-10/);
		});

		it("link has focus-ring utility applied (centralized focus style)", () => {
			renderCard();
			const link = screen.getByRole("link", { name: "Bagues Artisanales" });
			expect(link.className).toMatch(/focus-ring/);
		});
	});

	describe("title attribute regression", () => {
		/**
		 * @regression collection-card-no-title-attribute
		 * Audit 2026-05-24: `title={name}` retiré car redondant avec le texte enfant du heading
		 * (certains SR comme NVDA/VoiceOver l'annoncent deux fois). line-clamp est purement
		 * visuel, le texte complet reste accessible aux SR via le DOM.
		 */
		it("does NOT set a redundant title attribute on the heading", () => {
			renderCard({ name: "Collection Noël 2026 Édition Limitée" });
			const heading = screen.getByRole("heading");
			expect(heading.hasAttribute("title")).toBe(false);
		});
	});

	describe("heading levels", () => {
		it("renders h4 heading when headingLevel is 'h4'", () => {
			renderCard({ headingLevel: "h4" });
			expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
		});
	});

	describe("visual hierarchy: price primary, count as eyebrow (audit 2026-05-29 F3, révisé 2026-08-03)", () => {
		it("renders price as the primary signal (text-sm font-medium)", () => {
			const { container } = renderCard({ priceRange: { min: 2000, max: 5000 } });
			// Price <p> is the one wrapping the visible "À partir de" prefix.
			const fromPrefix = Array.from(container.querySelectorAll("span")).find((s) =>
				s.textContent.includes("À partir de"),
			);
			const price = fromPrefix?.closest("p");
			expect(price).not.toBeNull();
			expect(price!.className).toMatch(/text-sm/);
			expect(price!.className).toMatch(/font-medium/);
		});

		/**
		 * Révision 2026-08-03 (redesign « Planche-contact ») : le compteur n'est
		 * plus une méta discrète en pied de carte — il est promu en eyebrow
		 * « Collection · N créations » en tête de légende (la sémantique « série »
		 * dite textuellement, constat n°2 de l'audit). L'esprit de F3 est
		 * conservé : il reste visuellement subordonné au prix (micro-typo
		 * text-2xs muted vs text-sm font-medium).
		 */
		it("renders productCount as the eyebrow (text-2xs uppercase muted, no font-medium)", () => {
			renderCard({ productCount: 42 });
			const count = screen.getByText("Collection · 42 créations");
			expect(count.className).toMatch(/text-2xs/);
			expect(count.className).toMatch(/uppercase/);
			expect(count.className).toMatch(/text-muted-foreground/);
			expect(count.className).not.toMatch(/font-medium/);
		});
	});

	describe("description visibility (audit 2026-05-29 F7)", () => {
		/**
		 * @regression collection-card-description-visible-all-viewports
		 * Audit 2026-05-29: la description, auparavant `sr-only sm:not-sr-only`, est désormais
		 * visible sur tous les viewports (mobile inclus). Décision user explicite.
		 */
		it("description is visible on all viewports (no sr-only / hidden gating)", () => {
			renderCard({ description: "Bijoux faits à la main" });
			const desc = screen.getByText("Bijoux faits à la main");
			expect(desc.className).not.toMatch(/sr-only/);
			expect(desc.className).not.toMatch(/(?<![a-z:])hidden/);
			expect(desc.className).toMatch(/line-clamp-2/);
		});
	});

	describe("from-price framing (audit 2026-05-29 10/10)", () => {
		it("renders an 'À partir de' prefix followed by the minimum price", () => {
			const { container } = renderCard({ priceRange: { min: 2000, max: 5000 } });
			const fromPrefix = Array.from(container.querySelectorAll("span")).find((s) =>
				s.textContent.includes("À partir de"),
			);
			expect(fromPrefix).toBeDefined();
			const price = fromPrefix!.closest("p");
			// Shows the min (20.00 €), never the max (50.00 €).
			expect(price!.textContent).toContain("20.00");
			expect(price!.textContent).not.toContain("50.00");
		});

		it("uses the same 'À partir de' framing when min equals max", () => {
			const { container } = renderCard({ priceRange: { min: 3000, max: 3000 } });
			const price = Array.from(container.querySelectorAll("p")).find((p) =>
				p.textContent.includes("À partir de"),
			);
			expect(price).toBeDefined();
			expect(price!.textContent).toContain("30.00");
		});

		it("does NOT render a price block when priceRange is absent", () => {
			const { container } = renderCard({});
			const hasFrom = Array.from(container.querySelectorAll("p")).some((p) =>
				p.textContent.includes("À partir de"),
			);
			expect(hasFrom).toBe(false);
		});
	});

	describe("empty state (audit 2026-05-29 F6)", () => {
		it("renders the 'Bientôt' signal when productCount is 0", () => {
			renderCard({ productCount: 0 });
			expect(screen.getByText(/Bientôt/)).toBeInTheDocument();
		});

		it("renders the creation count (not 'Bientôt') when productCount > 0", () => {
			renderCard({ productCount: 5 });
			expect(screen.getByText("Collection · 5 créations")).toBeInTheDocument();
			expect(screen.queryByText(/Bientôt/)).not.toBeInTheDocument();
		});

		it("renders neither count nor 'Bientôt' when productCount is undefined", () => {
			renderCard({});
			expect(screen.queryByText(/Bientôt/)).not.toBeInTheDocument();
			expect(screen.queryByText(/création/)).not.toBeInTheDocument();
		});
	});

	describe("planche-contact frame (redesign 2026-08-03)", () => {
		it("renders the bento in framed mode (tirage inséré dans le cadre)", () => {
			renderCard({ images: mockImages });
			expect(screen.getByTestId("collection-images-grid")).toHaveAttribute("data-framed", "true");
		});

		it("sets the title in Fraunces (font-display)", () => {
			renderCard();
			const heading = screen.getByRole("heading");
			expect(heading.className).toMatch(/font-display/);
		});

		it("tilts left on even index and right on odd index (hover, motion-safe + can-hover)", () => {
			const { container } = renderCard({ index: 0 });
			expect(container.querySelector("article")!.className).toContain(
				"motion-safe:can-hover:hover:-rotate-1",
			);
			cleanup();
			const { container: odd } = renderCard({ index: 1 });
			expect(odd.querySelector("article")!.className).toContain(
				"motion-safe:can-hover:hover:rotate-1",
			);
			expect(odd.querySelector("article")!.className).not.toContain(
				"motion-safe:can-hover:hover:-rotate-1",
			);
		});
	});
});
