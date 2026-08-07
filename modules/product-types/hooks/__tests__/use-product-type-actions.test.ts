import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockToggleStatus, mockDuplicate, mockUseIsMobile } = vi.hoisted(() => ({
	mockToggleStatus: vi.fn(),
	mockDuplicate: vi.fn(),
	mockUseIsMobile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/shared/hooks/use-haptic", () => ({ useHaptic: () => vi.fn() }));
vi.mock("@/shared/hooks/use-mobile", () => ({ useIsMobile: mockUseIsMobile }));
vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
	useAlertDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));
vi.mock("@/shared/utils/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../use-duplicate-product-type", () => ({
	useDuplicateProductType: () => ({ duplicate: mockDuplicate, isPending: false }),
}));
vi.mock("../use-toggle-product-type-status", () => ({
	useToggleProductTypeStatus: () => ({ toggleStatus: mockToggleStatus, isPending: false }),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useProductTypeActions } from "../use-product-type-actions";

const BASE_PARAMS = {
	productTypeId: "pt-1",
	label: "Bague",
	description: null,
	slug: "bague",
	productsCount: 2,
};

function findItem(sections: ActionMenuSection[], key: string) {
	return sections.flatMap((section) => section.items).find((item) => item.key === key);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockUseIsMobile.mockReturnValue(true);
});

describe("useProductTypeActions", () => {
	// Même trou que pour les couleurs : la liste mobile n'a qu'un badge en lecture
	// seule, donc sans cet item la bascule y était impossible.
	it("expose Désactiver quand le type est actif", () => {
		const { result } = renderHook(() => useProductTypeActions({ ...BASE_PARAMS, isActive: true }));

		expect(findItem(result.current.sections, "toggle")?.label).toBe("Désactiver");
	});

	it("expose Activer quand le type est inactif", () => {
		const { result } = renderHook(() => useProductTypeActions({ ...BASE_PARAMS, isActive: false }));

		expect(findItem(result.current.sections, "toggle")?.label).toBe("Activer");
	});

	it("bascule vers l'état inverse au clic", () => {
		const { result } = renderHook(() => useProductTypeActions({ ...BASE_PARAMS, isActive: false }));

		findItem(result.current.sections, "toggle")?.onSelect?.();

		expect(mockToggleStatus).toHaveBeenCalledWith("pt-1", true);
	});

	it("masque la bascule pour un type système", () => {
		// `toggleProductTypeStatus` filtre `isSystem: false` dans son updateMany : offrir
		// l'action produirait un échec systématique.
		const { result } = renderHook(() =>
			useProductTypeActions({ ...BASE_PARAMS, isActive: true, isSystem: true }),
		);

		expect(findItem(result.current.sections, "toggle")).toBeUndefined();
	});

	it("masque l'item quand l'état n'est pas connu de l'appelant", () => {
		const { result } = renderHook(() => useProductTypeActions(BASE_PARAMS));

		expect(findItem(result.current.sections, "toggle")).toBeUndefined();
	});

	it("garde l'édition en lecture seule pour un type système", () => {
		const { result } = renderHook(() => useProductTypeActions({ ...BASE_PARAMS, isSystem: true }));

		const edit = findItem(result.current.sections, "edit");
		expect(edit?.label).toBe("Voir (lecture seule)");
		expect(edit?.disabled).toBe(true);
		expect(findItem(result.current.sections, "delete")?.hidden).toBe(true);
	});
});
