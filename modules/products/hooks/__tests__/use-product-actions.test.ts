import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseAlertDialog, mockUseDialog } = vi.hoisted(() => ({
	mockUseAlertDialog: vi.fn(),
	mockUseDialog: vi.fn(),
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: mockUseAlertDialog,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

// Mock dialog files (containing only ID const) — évite la chaîne d'imports
// transitifs vers `data/` (`"use server"`) qui charge auth + Stripe en test.
vi.mock("@/modules/products/components/admin/archive-product-alert-dialog", () => ({
	ARCHIVE_PRODUCT_DIALOG_ID: "archive-product-dialog",
}));
vi.mock("@/modules/products/components/admin/change-product-status-alert-dialog", () => ({
	CHANGE_PRODUCT_STATUS_DIALOG_ID: "change-product-status-dialog",
}));
vi.mock("@/modules/products/components/admin/delete-product-alert-dialog", () => ({
	DELETE_PRODUCT_DIALOG_ID: "delete-product-dialog",
}));
vi.mock("@/modules/products/components/admin/duplicate-product-alert-dialog", () => ({
	DUPLICATE_PRODUCT_DIALOG_ID: "duplicate-product-dialog",
}));
vi.mock("@/modules/products/components/admin/manage-collections-dialog", () => ({
	MANAGE_COLLECTIONS_DIALOG_ID: "manage-product-collections",
}));

import { useProductActions } from "../use-product-actions";

// ============================================================================
// Helpers
// ============================================================================

const baseParams = {
	productId: "prod-1",
	productSlug: "bague-eclat",
	productTitle: "Bague Éclat",
} as const;

function setupDialogMocks() {
	const open = vi.fn();
	mockUseAlertDialog.mockReturnValue({ open });
	mockUseDialog.mockReturnValue({ open });
	return open;
}

function findItem(sections: ReturnType<typeof useProductActions>["sections"], key: string) {
	for (const section of sections) {
		const item = section.items.find((i) => i.key === key);
		if (item) return item;
	}
	return undefined;
}

// ============================================================================
// Tests
// ============================================================================

describe("useProductActions", () => {
	it("expose toujours les actions manage (view, edit, duplicate, variants, collections)", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		expect(findItem(result.current.sections, "view")).toBeDefined();
		expect(findItem(result.current.sections, "edit")).toBeDefined();
		expect(findItem(result.current.sections, "duplicate")).toBeDefined();
		expect(findItem(result.current.sections, "variants")).toBeDefined();
		expect(findItem(result.current.sections, "collections")).toBeDefined();
	});

	it("désactive Marquer comme brouillon pour un produit DRAFT", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "DRAFT" }),
		);

		const draft = findItem(result.current.sections, "draft");
		expect(draft?.disabled).toBe(true);
	});

	it("désactive Publier pour un produit PUBLIC", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		const publishItem = findItem(result.current.sections, "public");
		expect(publishItem?.disabled).toBe(true);
	});

	it("masque les actions de statut quand le produit est ARCHIVED", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "ARCHIVED" }),
		);

		expect(findItem(result.current.sections, "draft")?.hidden).toBe(true);
		expect(findItem(result.current.sections, "public")?.hidden).toBe(true);
	});

	it("affiche Restaurer (pas Archiver) pour un produit ARCHIVED", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "ARCHIVED" }),
		);

		expect(findItem(result.current.sections, "archive")?.hidden).toBe(true);
		expect(findItem(result.current.sections, "restore")?.hidden).toBe(false);
	});

	it("affiche Archiver (pas Restaurer) pour un produit non ARCHIVED", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		expect(findItem(result.current.sections, "archive")?.hidden).toBe(false);
		expect(findItem(result.current.sections, "restore")?.hidden).toBe(true);
	});

	it("masque Supprimer définitivement sauf si produit ARCHIVED", () => {
		setupDialogMocks();

		const { result: draftResult } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "DRAFT" }),
		);
		expect(findItem(draftResult.current.sections, "delete")?.hidden).toBe(true);

		const { result: archivedResult } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "ARCHIVED" }),
		);
		expect(findItem(archivedResult.current.sections, "delete")?.hidden).toBe(false);
	});

	it("ouvre changeStatusDialog avec le targetStatus correct au clic", () => {
		const open = setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "DRAFT" }),
		);

		const publishItem = findItem(result.current.sections, "public");
		publishItem?.onSelect?.();

		expect(open).toHaveBeenCalledWith(
			expect.objectContaining({
				productId: "prod-1",
				productTitle: "Bague Éclat",
				currentStatus: "DRAFT",
				targetStatus: "PUBLIC",
			}),
		);
	});

	it("ouvre archiveDialog avec productStatus au clic Archiver", () => {
		const open = setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		const archiveItem = findItem(result.current.sections, "archive");
		archiveItem?.onSelect?.();

		expect(open).toHaveBeenCalledWith(
			expect.objectContaining({
				productId: "prod-1",
				productTitle: "Bague Éclat",
				productStatus: "PUBLIC",
			}),
		);
	});

	it("expose Voir la fiche comme lien externe vers /creations/[slug]", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		const viewItem = findItem(result.current.sections, "view");
		expect(viewItem?.href).toBe("/creations/bague-eclat");
		expect(viewItem?.external).toBe(true);
	});

	it("expose Modifier comme lien vers /admin/catalogue/produits/[slug]/modifier", () => {
		setupDialogMocks();
		const { result } = renderHook(() =>
			useProductActions({ ...baseParams, productStatus: "PUBLIC" }),
		);

		const editItem = findItem(result.current.sections, "edit");
		expect(editItem?.href).toBe("/admin/catalogue/produits/bague-eclat/modifier");
	});
});
