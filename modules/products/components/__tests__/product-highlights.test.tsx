import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	ProductHighlight,
	ProductHighlightId,
} from "@/modules/products/services/product-highlights.service";
import type { GetProductReturn } from "@/modules/products/types/product.types";

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

function makeHighlight(
	id: ProductHighlightId,
	label: string,
	description: string,
): ProductHighlight {
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

	it("renders exactly one icon per highlight item", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("material", "Argent 925", "Matière"),
			makeHighlight("handmade", "Fait main", "Unique"),
			makeHighlight("french", "Artisanat français", "France"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
		for (const item of items) {
			const icons = item.querySelectorAll("svg");
			expect(icons).toHaveLength(1);
		}
	});

	it("wraps the list in a section with a visible heading", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("french", "Artisanat français", "Créé dans notre atelier en France"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		const section = screen.getByRole("region", { name: /Points clés/i });
		expect(section).toBeInTheDocument();

		const heading = within(section).getByRole("heading", { level: 2, name: /Points clés/i });
		expect(heading).toBeInTheDocument();
		// Le heading n'est plus sr-only : doit être visible (pas de classe sr-only)
		expect(heading).not.toHaveClass("sr-only");
	});

	it("renders each highlight as a list item", () => {
		mockGenerateHighlights.mockReturnValue([
			makeHighlight("material", "Alpha", "Desc A"),
			makeHighlight("color", "Beta", "Desc B"),
			makeHighlight("handmade", "Gamma", "Desc C"),
		]);

		render(<ProductHighlights product={makeProduct()} />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(3);
	});

	/**
	 * @regression product-highlights-icon-mapping
	 *
	 * Vérifie que chaque id stable du service a bien une icône mappée
	 * dans le composant. Si un nouveau ProductHighlightId est ajouté au service
	 * sans icône correspondante, TypeScript échoue à la compilation (satisfies)
	 * mais ce test garantit aussi qu'à l'exécution chaque id rend une icône.
	 */
	it("maps every ProductHighlightId to a rendered icon", () => {
		const allIds: ProductHighlightId[] = [
			"material",
			"color",
			"handmade",
			"french",
			"adjustable",
			"collection",
		];
		mockGenerateHighlights.mockReturnValue(
			allIds.map((id) => makeHighlight(id, `Label ${id}`, `Desc ${id}`)),
		);

		render(<ProductHighlights product={makeProduct()} />);

		const items = screen.getAllByRole("listitem");
		expect(items).toHaveLength(allIds.length);
		for (const item of items) {
			expect(item.querySelector("svg")).not.toBeNull();
		}
	});
});
