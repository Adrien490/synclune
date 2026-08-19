import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockSearchParams } = vi.hoisted(() => ({
	mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	usePathname: () => "/admin/catalogue/types-de-produits",
	useSearchParams: () => mockSearchParams.current,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { TaxonomyFilterBadges } from "../taxonomy-filter-badges";

afterEach(cleanup);

/** Le nom accessible du bouton de retrait CONTIENT le texte visible du badge. */
function badgeLabels(): string[] {
	return screen
		.queryAllByRole("button", { name: /^Supprimer le filtre/ })
		.map((button) => button.getAttribute("aria-label") ?? "");
}

describe("TaxonomyFilterBadges", () => {
	// ⚠️ `filter.key` porte le préfixe (`filter_hasProducts`). L'ancienne version
	// retirait `filter_` puis comparait à `"active"` alors que la feuille écrivait
	// `filter_isActive` : la comparaison échouait toujours et le badge tombait
	// dans son cas par défaut, rendant la clé technique — « isActive : true » —
	// dans le texte visible ET dans le nom accessible.
	it("rend le libellé du registre, jamais la clé d'URL", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=true");
		render(<TaxonomyFilterBadges kind="product-type" />);

		expect(badgeLabels()).toEqual(["Supprimer le filtre Bijoux : Avec bijoux"]);
		expect(badgeLabels().join(" ")).not.toContain("hasProducts");
	});

	it("traduit chaque valeur d'option", () => {
		mockSearchParams.current = new URLSearchParams("filter_hasProducts=false");
		render(<TaxonomyFilterBadges kind="product-type" />);

		expect(badgeLabels()).toEqual(["Supprimer le filtre Bijoux : Sans bijou"]);
	});

	it("retombe sur la valeur brute pour un paramètre inconnu, sans planter", () => {
		// Lien périmé ou saisie manuelle : le badge reste retirable.
		mockSearchParams.current = new URLSearchParams("filter_inconnu=42");
		render(<TaxonomyFilterBadges kind="product-type" />);

		expect(badgeLabels()).toEqual(["Supprimer le filtre inconnu : 42"]);
	});

	it("ne rend rien sans filtre actif", () => {
		mockSearchParams.current = new URLSearchParams("search=collier");
		render(<TaxonomyFilterBadges kind="product-type" />);

		expect(badgeLabels()).toEqual([]);
	});
});
