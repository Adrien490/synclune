/**
 * @regression taxonomy-delete-payload-contract
 *
 * La mutualisation `taxonomies` (dialog de suppression unique) avait réécrit le
 * dialog pour lire `{ id, displayName, usageCount? }` SANS mettre à jour les
 * trois ouvreurs, restés sur leurs clés historiques (`colorId`/`colorName`,
 * `materialId`/`materialName`, `productTypeId`/`label`/`productsCount`). Le
 * champ caché retombait sur `String(undefined ?? "")` : le dialog affichait
 * « supprimer "" ? », postait `id=""`, `z.cuid2()` rejetait — AUCUNE suppression
 * de couleur, matériau ou type n'était possible depuis l'UI. `tsc` ne voyait
 * rien : chaque ouvreur typait son `useAlertDialog` avec sa forme locale.
 *
 * Ce test exerce la chaîne RÉELLE ouvreur → store → dialog : le hook d'actions
 * publie son payload dans le VRAI `AlertDialogStoreProvider`, et le VRAI
 * `DeleteConfirmationDialog` doit en dériver le champ caché et le nom affiché.
 * ⚠️ Ne JAMAIS mocker `alert-dialog-store-provider` ici : c'est précisément le
 * mock du store qui rendait ce défaut invisible aux tests existants. Seule la
 * primitive Radix est remplacée par des pass-through.
 *
 * Prouvé en réintroduisant l'ancien payload (`openAlert({ colorId, colorName })`) :
 * 4 assertions rouges (champ caché vide + nom absent, sur les deux kinds touchés).
 */
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseIsMobile } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
}));
vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false, data: undefined }),
}));
vi.mock("@/shared/hooks/use-back-to-list-on-delete", () => ({
	useBackToListOnDelete: () => vi.fn(),
}));

// Primitive Radix en pass-through : le contrat testé est le payload, pas le
// portal. `open` reste respecté pour que le contenu ne monte qu'à l'ouverture.
vi.mock("@/shared/components/ui/responsive-alert-dialog", () => {
	const passthrough = (testId: string) => {
		const Passthrough = ({ children }: { children?: ReactNode }) => (
			<div data-testid={testId}>{children}</div>
		);
		Passthrough.displayName = `Passthrough(${testId})`;
		return Passthrough;
	};
	return {
		ResponsiveAlertDialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
			open ? <div data-testid="alert-dialog">{children}</div> : null,
		ResponsiveAlertDialogContent: passthrough("alert-dialog-content"),
		ResponsiveAlertDialogHeader: passthrough("alert-dialog-header"),
		ResponsiveAlertDialogFooter: passthrough("alert-dialog-footer"),
		ResponsiveAlertDialogTitle: passthrough("alert-dialog-title"),
		ResponsiveAlertDialogDescription: ({ children }: { children?: ReactNode }) => (
			<div data-testid="alert-dialog-description">{children}</div>
		),
		ResponsiveAlertDialogCancel: ({ children }: { children?: ReactNode }) => (
			<button type="button">{children}</button>
		),
		ResponsiveAlertDialogAction: ({ children }: { children?: ReactNode }) => (
			<button type="submit">{children}</button>
		),
	};
});

// Hooks de mutation mockés : le test ne porte pas sur les Server Actions, et
// les importer tirerait Prisma dans le bundle de test.
const inertAction = { action: vi.fn(), isPending: false };
vi.mock("@/modules/colors/hooks/use-delete-color", () => ({
	useDeleteColor: () => inertAction,
}));
vi.mock("@/modules/colors/hooks/use-duplicate-color", () => ({
	useDuplicateColor: () => ({ duplicate: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/colors/hooks/use-toggle-color-status", () => ({
	useToggleColorStatus: () => ({ toggleStatus: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/materials/hooks/use-delete-material", () => ({
	useDeleteMaterial: () => inertAction,
}));
vi.mock("@/modules/materials/hooks/use-duplicate-material", () => ({
	useDuplicateMaterial: () => ({ duplicate: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/materials/hooks/use-toggle-material-status", () => ({
	useToggleMaterialStatus: () => ({ toggleStatus: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/product-types/hooks/use-delete-product-type", () => ({
	useDeleteProductType: () => inertAction,
}));
vi.mock("@/modules/product-types/hooks/use-duplicate-product-type", () => ({
	useDuplicateProductType: () => ({ duplicate: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/product-types/hooks/use-toggle-product-type-status", () => ({
	useToggleProductTypeStatus: () => ({ toggleStatus: vi.fn(), isPending: false }),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";

import { DeleteColorAlertDialog } from "@/modules/colors/components/admin/delete-color-alert-dialog";
import { useColorActions } from "@/modules/colors/hooks/use-color-actions";
import { DeleteMaterialAlertDialog } from "@/modules/materials/components/admin/delete-material-alert-dialog";
import { useMaterialActions } from "@/modules/materials/hooks/use-material-actions";
import { DeleteProductTypeAlertDialog } from "@/modules/product-types/components/admin/delete-product-type-alert-dialog";
import { useProductTypeActions } from "@/modules/product-types/hooks/use-product-type-actions";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";

// ============================================================================
// Helpers
// ============================================================================

const COLOR_ID = "tz4a98xxat96iws9zmbrgj3a";
const MATERIAL_ID = "pfh0haxfpzowht3oi213cqos";
const PRODUCT_TYPE_ID = "ldpzcmwtdsuwvhcnkfywlkb1";

/** Rend le bouton « Supprimer » du menu d'actions réel du module. */
function DeleteTrigger({ sections }: { sections: ActionMenuSection[] }) {
	const deleteItem = sections.flatMap((s) => s.items).find((i) => i.key === "delete");
	return (
		<button type="button" onClick={() => deleteItem?.onSelect?.()}>
			Ouvrir la suppression
		</button>
	);
}

function ColorScenario() {
	const { sections } = useColorActions({
		colorId: COLOR_ID,
		colorName: "Or rose",
		colorHex: "#B76E79",
		colorSlug: "or-rose",
	});
	return <DeleteTrigger sections={sections} />;
}

function MaterialScenario() {
	const { sections } = useMaterialActions({
		materialId: MATERIAL_ID,
		materialName: "Argent 925",
		materialSlug: "argent-925",
		materialDescription: null,
		materialIsActive: true,
	});
	return <DeleteTrigger sections={sections} />;
}

function ProductTypeScenario({ productsCount = 0 }: { productsCount?: number }) {
	const { sections } = useProductTypeActions({
		productTypeId: PRODUCT_TYPE_ID,
		label: "Bague",
		slug: "bague",
		productsCount,
		isActive: true,
	});
	return <DeleteTrigger sections={sections} />;
}

function renderScenario(scenario: ReactNode, dialog: ReactNode) {
	return render(
		<AlertDialogStoreProvider>
			{scenario}
			{dialog}
		</AlertDialogStoreProvider>,
	);
}

function hiddenInput(container: HTMLElement, name: string): HTMLInputElement | null {
	return container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockUseIsMobile.mockReturnValue(false);
});

// Le setup vitest du repo ne branche pas le cleanup automatique de RTL.
afterEach(cleanup);

// ============================================================================
// Contrat payload ouvreur → dialog
// ============================================================================

describe("contrat payload dialog de suppression ↔ ouvreurs taxonomies", () => {
	it("couleur : le champ caché porte l'id et le dialog affiche le nom", async () => {
		const user = userEvent.setup();
		const { container } = renderScenario(<ColorScenario />, <DeleteColorAlertDialog />);

		await user.click(screen.getByRole("button", { name: "Ouvrir la suppression" }));

		const input = hiddenInput(container, TAXONOMY_CONFIG.color.formFields.deleteId);
		expect(input).not.toBeNull();
		expect(input?.value).toBe(COLOR_ID);
		expect(screen.getByText(/Or rose/)).toBeInTheDocument();
	});

	it("matériau : le champ caché porte l'id et le dialog affiche le nom", async () => {
		const user = userEvent.setup();
		const { container } = renderScenario(<MaterialScenario />, <DeleteMaterialAlertDialog />);

		await user.click(screen.getByRole("button", { name: "Ouvrir la suppression" }));

		const input = hiddenInput(container, TAXONOMY_CONFIG.material.formFields.deleteId);
		expect(input).not.toBeNull();
		expect(input?.value).toBe(MATERIAL_ID);
		expect(screen.getByText(/Argent 925/)).toBeInTheDocument();
	});

	it("type de bijou : le champ caché porte l'id et le dialog affiche le label", async () => {
		const user = userEvent.setup();
		const { container } = renderScenario(<ProductTypeScenario />, <DeleteProductTypeAlertDialog />);

		await user.click(screen.getByRole("button", { name: "Ouvrir la suppression" }));

		const input = hiddenInput(container, TAXONOMY_CONFIG["product-type"].formFields.deleteId);
		expect(input).not.toBeNull();
		expect(input?.value).toBe(PRODUCT_TYPE_ID);
		expect(screen.getByText(/Bague/)).toBeInTheDocument();
	});

	it("type de bijou utilisé : l'avertissement d'usage est visible (usageCount câblé)", async () => {
		const user = userEvent.setup();
		renderScenario(<ProductTypeScenario productsCount={3} />, <DeleteProductTypeAlertDialog />);

		await user.click(screen.getByRole("button", { name: "Ouvrir la suppression" }));

		expect(screen.getByText(/Impossible : 3 produits/)).toBeInTheDocument();
	});

	it("couleur non utilisée : aucun avertissement d'usage fantôme", async () => {
		const user = userEvent.setup();
		renderScenario(<ColorScenario />, <DeleteColorAlertDialog />);

		await user.click(screen.getByRole("button", { name: "Ouvrir la suppression" }));

		expect(screen.queryByText(/Impossible :/)).not.toBeInTheDocument();
	});
});
