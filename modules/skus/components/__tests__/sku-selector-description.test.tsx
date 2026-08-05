import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La consigne de la carte de variante doit décrire la SÉLECTION, pas la structure
 * du produit.
 *
 * Défaut d'origine (audit PDP 2026-08-05) : `getDescription()` énumérait les axes
 * qui EXISTENT. Comme une variante est auto-sélectionnée à l'arrivée
 * (`page.tsx`, `product.skus[0]`), la carte affichait en permanence « Choisis la
 * couleur pour continuer » alors que la pastille portait son scotch, que le prix
 * était exact et que le CTA disait « Ajouter au panier » — « pour continuer »
 * annonçait un blocage inexistant.
 *
 * Second défaut au même endroit : le seuil de la couleur était `> 0` là où
 * `useVariantValidation.requiresColor` exige `> 1`, donc une fiche à couleur unique
 * réclamait « la couleur », qui n'est pas un choix.
 */

const { mockSearchParams, mockUseSelectedSku, mockExtractVariantInfo, mockUseVariantValidation } =
	vi.hoisted(() => ({
		mockSearchParams: { get: vi.fn((_key: string): string | null => null) },
		mockUseSelectedSku: vi.fn(),
		mockExtractVariantInfo: vi.fn(),
		mockUseVariantValidation: vi.fn(),
	}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
	useRouter: () => ({ replace: vi.fn() }),
	usePathname: () => "/creations/bague-etoile",
}));

vi.mock("@/modules/skus/hooks/use-selected-sku", () => ({
	useSelectedSku: mockUseSelectedSku,
}));

vi.mock("@/modules/skus/hooks/use-sku-validation", () => ({
	useVariantValidation: mockUseVariantValidation,
}));

vi.mock("@/modules/skus/services/sku-info-extraction.service", () => ({
	extractVariantInfo: mockExtractVariantInfo,
}));

// Les trois sélecteurs enfants sont autonomes (routeur, transitions optimistes) :
// ce test ne porte que sur la consigne rendue par l'orchestrateur.
vi.mock("@/modules/colors/components/color-selector", () => ({
	ColorSelector: () => <div data-testid="color-selector" />,
}));
vi.mock("@/modules/skus/components/material-selector", () => ({
	MaterialSelector: () => <div data-testid="material-selector" />,
}));
vi.mock("@/modules/skus/components/size-selector", () => ({
	SizeSelector: () => <div data-testid="size-selector" />,
}));

import { VariantSelector } from "../sku-selector";

afterEach(cleanup);

type VariantInfo = {
	availableColors: unknown[];
	availableMaterials: unknown[];
	availableSizes: unknown[];
	availableCombos: unknown[];
};

function setVariantInfo(overrides: Partial<VariantInfo> = {}) {
	mockExtractVariantInfo.mockReturnValue({
		availableColors: [],
		availableMaterials: [],
		availableSizes: [],
		availableCombos: [],
		...overrides,
	});
}

/** Deux SKUs minimum, sinon `VariantSelector` ne rend rien du tout. */
const product = { skus: [{ id: "sku-1" }, { id: "sku-2" }] } as never;

const selectedSku = { id: "sku-1", inventory: 5, isActive: true, colors: [] } as never;

beforeEach(() => {
	mockSearchParams.get.mockReturnValue(null);
	mockUseVariantValidation.mockReturnValue({ requiresSize: false, validationErrors: [] });
	mockUseSelectedSku.mockReturnValue({ selectedSku });
	setVariantInfo();
});

describe("VariantSelector — la consigne", () => {
	it("n'ordonne PAS de choisir la couleur quand une variante est déjà retenue", () => {
		setVariantInfo({ availableColors: [{ id: "c1" }, { id: "c2" }] });

		render(<VariantSelector product={product} />);

		expect(screen.queryByText(/pour continuer/i)).not.toBeInTheDocument();
		expect(screen.getByText("Tu peux changer de couleur quand tu veux.")).toBeInTheDocument();
	});

	it("énumère les axes ouverts quand plusieurs le sont", () => {
		setVariantInfo({
			availableColors: [{ id: "c1" }, { id: "c2" }],
			availableMaterials: [{ name: "Argent" }, { name: "Or" }],
			availableSizes: [{ size: "M" }],
		});
		mockUseVariantValidation.mockReturnValue({ requiresSize: true, validationErrors: [] });

		render(<VariantSelector product={product} />);

		expect(
			screen.getByText("Tu peux changer de couleur, de matériau ou de taille quand tu veux."),
		).toBeInTheDocument();
	});

	it("ne réclame pas « la couleur » quand il n'y en a qu'une", () => {
		setVariantInfo({
			availableColors: [{ id: "c1" }],
			availableSizes: [{ size: "M" }, { size: "L" }],
		});
		mockUseVariantValidation.mockReturnValue({ requiresSize: true, validationErrors: [] });

		render(<VariantSelector product={product} />);

		expect(screen.queryByText(/couleur/i)).not.toBeInTheDocument();
		expect(screen.getByText("Tu peux changer de taille quand tu veux.")).toBeInTheDocument();
	});

	it("redemande les axes manquants quand AUCUNE variante ne correspond", () => {
		setVariantInfo({ availableColors: [{ id: "c1" }, { id: "c2" }] });
		mockUseSelectedSku.mockReturnValue({ selectedSku: null });

		render(<VariantSelector product={product} />);

		expect(screen.getByText("Choisis la couleur pour continuer")).toBeInTheDocument();
	});

	it("lit `?variant=` et non le seul `?color=` legacy pour la validation", () => {
		setVariantInfo({ availableColors: [{ id: "c1" }, { id: "c2" }] });
		mockSearchParams.get.mockImplementation((key: string) =>
			key === "variant" ? "argent__or-rose" : null,
		);

		render(<VariantSelector product={product} />);

		expect(mockUseVariantValidation).toHaveBeenCalledWith(
			expect.objectContaining({ selection: expect.objectContaining({ color: "argent__or-rose" }) }),
		);
	});
});
