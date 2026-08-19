import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockDialogState } = vi.hoisted(() => ({
	mockDialogState: {
		current: {
			isOpen: true,
			close: vi.fn(),
			data: undefined as { id: string; displayName: string; usageCount?: number } | undefined,
		},
	},
}));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useAlertDialog: () => mockDialogState.current,
}));
vi.mock("@/shared/hooks/use-back-to-list-on-delete", () => ({
	useBackToListOnDelete: () => vi.fn(),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { TaxonomyDeleteAlertDialog } from "../taxonomy-delete-alert-dialog";
import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";
import type { TaxonomyKind } from "../../types/taxonomy.types";

const KINDS: TaxonomyKind[] = ["color", "material", "product-type"];

beforeEach(() => {
	mockDialogState.current = {
		isOpen: true,
		close: vi.fn(),
		data: { id: "tax-1", displayName: "Rose bonbon" },
	};
});

afterEach(cleanup);

/** Texte du nœud désigné par `aria-labelledby` — le nom accessible du dialog. */
function accessibleTitle(): string {
	const dialog = screen.getByRole("alertdialog");
	const id = dialog.getAttribute("aria-labelledby");
	return (id ? (document.getElementById(id)?.textContent ?? "") : "").trim();
}

describe("TaxonomyDeleteAlertDialog", () => {
	// ⚠️ LE test de ce fichier. `ConfirmDialog` déclare `title: ReactNode`, dont
	// `undefined` est un membre valide : quand le registre portait un
	// `deleteDialogTitle?` optionnel, les dialogs des couleurs et des matériaux se
	// rendaient sans titre visible ET sans nom accessible (aria-labelledby pointant
	// sur un nœud vide), sans que `tsc` ni le lint ne voient quoi que ce soit.
	it.each(KINDS)("%s : le dialog porte un nom accessible non vide", (kind) => {
		render(<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG[kind]} action={vi.fn()} />);

		expect(accessibleTitle()).toBe(TAXONOMY_CONFIG[kind].deleteDialogTitle);
		expect(accessibleTitle().length).toBeGreaterThan(0);
	});

	it("nomme l'entité visée dans la prose", () => {
		render(<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.color} action={vi.fn()} />);

		expect(screen.getByText(/Rose bonbon/)).toBeInTheDocument();
	});

	it("poste l'id dans le champ attendu par la Server Action", () => {
		render(<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG["product-type"]} action={vi.fn()} />);

		// Le champ diffère d'un module à l'autre (`id` vs `productTypeId`) : c'est le
		// registre qui porte l'écart, et un renommage silencieux posterait un id vide.
		const field = document.querySelector<HTMLInputElement>('input[name="productTypeId"]');
		expect(field?.value).toBe("tax-1");
	});

	describe("garde d'usage", () => {
		it("laisse confirmer quand rien ne référence l'étiquette", () => {
			mockDialogState.current.data = { id: "tax-1", displayName: "Rose bonbon", usageCount: 0 };
			render(<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.color} action={vi.fn()} />);

			expect(screen.getByRole("button", { name: "Supprimer" })).toBeEnabled();
			expect(screen.queryByText(/Impossible/)).not.toBeInTheDocument();
		});

		it.each([
			[1, "1 variante utilise"],
			[3, "3 variantes utilisent"],
		])("désactive la confirmation à %i référence(s)", (usageCount, expected) => {
			mockDialogState.current.data = { id: "tax-1", displayName: "Rose bonbon", usageCount };
			render(<TaxonomyDeleteAlertDialog config={TAXONOMY_CONFIG.color} action={vi.fn()} />);

			// La FK est en ON DELETE RESTRICT : la Server Action refuserait de toute
			// façon. Un bouton actif ne produirait qu'un toast d'erreur après coup —
			// et `confirmDisabled` est le SEUL mécanisme de validation que
			// `ConfirmDialog` admet, puisqu'il se ferme au clic.
			expect(screen.getByRole("button", { name: "Supprimer" })).toBeDisabled();
			expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
		});
	});
});
