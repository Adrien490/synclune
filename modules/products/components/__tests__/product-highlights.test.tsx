import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductHighlight } from "@/modules/products/services/product-highlights.service";

// ─── Hoist mock refs ──────────────────────────────────────────────────────────

const { mockGenerateHighlights } = vi.hoisted(() => ({
	mockGenerateHighlights: vi.fn<(product: GetProductReturn) => ProductHighlight[]>(),
}));

vi.mock("@/modules/products/services/product-highlights.service", () => ({
	generateHighlights: mockGenerateHighlights,
}));

import { ProductHighlights } from "../product-highlights";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProduct(): GetProductReturn {
	return {
		id: "prod-1",
		title: "Collier Étoile",
		skus: [],
		collections: [],
	} as unknown as GetProductReturn;
}

function makeHighlight(id: string, label: string, description: string): ProductHighlight {
	return { id, label, description, priority: 1 };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductHighlights", () => {
	it("renders a list of highlights with their label and description", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("material", "Argent 925", "Matériau de qualité sélectionné avec soin"),
			makeHighlight("handmade", "Fait main", "Chaque pièce est unique, façonnée à la main"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		expect(screen.getByText("Argent 925")).toBeInTheDocument();
		expect(screen.getByText("Matériau de qualité sélectionné avec soin")).toBeInTheDocument();
		expect(screen.getByText("Fait main")).toBeInTheDocument();
		expect(screen.getByText("Chaque pièce est unique, façonnée à la main")).toBeInTheDocument();
	});

	it("returns null and renders nothing when there are no highlights", () => {
		mockGenerateHighlights.mockReturnValue([]);

		const { container } = render(<ProductHighlights product={makeProduct()} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders bullet dot indicators alongside each highlight", () => {
		mockGenerateHighlights.mockReturnValue([makeHighlight("handmade", "Fait main", "Description")]);

		render(<ProductHighlights product={makeProduct()} />);

		// The bullet dot spans are aria-hidden
		const dots = document.querySelectorAll('[aria-hidden="true"]');
		expect(dots.length).toBeGreaterThanOrEqual(1);
	});

	it("wraps the list in a section with an accessible title", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("french", "Artisanat français", "Créé dans notre atelier en France"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		const section = screen.getByRole("region", { name: /Points clés du produit/i });
		expect(section).toBeInTheDocument();

		// The heading is visually hidden with sr-only
		const heading = screen.getByText("Points clés du produit");
		expect(heading).toBeInTheDocument();
	});

	it("renders each highlight as a list item", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("a", "Alpha", "Desc A"),
			makeHighlight("b", "Beta", "Desc B"),
			makeHighlight("c", "Gamma", "Desc C"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
	});
});
