import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPush, mockOpen, mockUseIsMobile } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockOpen: vi.fn(),
	mockUseIsMobile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));
vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: mockOpen, close: vi.fn(), isOpen: false, data: undefined }),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { CreateTaxonomyButton } from "../taxonomy-list-controls";
import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";

beforeEach(() => {
	vi.clearAllMocks();
	mockUseIsMobile.mockReturnValue(false);
});

// Le setup vitest du repo ne branche pas le cleanup automatique de RTL : sans
// ceci, les rendus s'empilent et `getByRole` échoue en « multiple elements ».
afterEach(cleanup);

// ============================================================================
// CreateTaxonomyButton
// ============================================================================

describe("CreateTaxonomyButton", () => {
	it("affiche le libellé de création de la taxonomie", () => {
		render(<CreateTaxonomyButton kind="material" />);

		expect(screen.getByRole("button", { name: "Créer un matériau" })).toBeInTheDocument();
	});

	it("desktop : ouvre le dialogue de formulaire sans naviguer", async () => {
		mockUseIsMobile.mockReturnValue(false);
		const user = userEvent.setup();
		render(<CreateTaxonomyButton kind="color" />);

		await user.click(screen.getByRole("button", { name: "Créer une couleur" }));

		expect(mockOpen).toHaveBeenCalledTimes(1);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("mobile : navigue vers la page dédiée sans ouvrir de dialogue", async () => {
		// Le dialogue est trop à l'étroit sur mobile : la page `/nouveau` prend le relais.
		mockUseIsMobile.mockReturnValue(true);
		const user = userEvent.setup();
		render(<CreateTaxonomyButton kind="color" />);

		await user.click(screen.getByRole("button", { name: "Créer une couleur" }));

		expect(mockPush).toHaveBeenCalledWith("/admin/catalogue/couleurs/nouveau");
		expect(mockOpen).not.toHaveBeenCalled();
	});

	it.each([
		["color", "/admin/catalogue/couleurs/nouveau"],
		["material", "/admin/catalogue/materiaux/nouveau"],
		["product-type", "/admin/catalogue/types-de-produits/nouveau"],
	] as const)("mobile %s : cible %s", async (kind, expectedPath) => {
		mockUseIsMobile.mockReturnValue(true);
		const user = userEvent.setup();
		render(<CreateTaxonomyButton kind={kind} />);

		await user.click(screen.getByRole("button"));

		expect(mockPush).toHaveBeenCalledWith(expectedPath);
	});
});
