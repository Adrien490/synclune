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
vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));
vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({ open: vi.fn(), close: vi.fn(), isOpen: false }),
}));
vi.mock("@/shared/utils/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../use-duplicate-color", () => ({
	useDuplicateColor: () => ({ duplicate: mockDuplicate, isPending: false }),
}));
vi.mock("../use-toggle-color-status", () => ({
	useToggleColorStatus: () => ({ toggleStatus: mockToggleStatus, isPending: false }),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useColorActions } from "../use-color-actions";

const BASE_PARAMS = {
	colorId: "color-1",
	colorName: "Rose poudré",
	colorHex: "#E8C4C4",
	colorSlug: "rose-poudre",
	colorDescription: null,
};

function itemKeys(sections: ActionMenuSection[]): string[] {
	return sections.flatMap((section) => section.items.map((item) => item.key));
}

function findItem(sections: ActionMenuSection[], key: string) {
	return sections.flatMap((section) => section.items).find((item) => item.key === key);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockUseIsMobile.mockReturnValue(true);
});

describe("useColorActions", () => {
	it("expose les actions de gestion et la suppression", () => {
		const { result } = renderHook(() => useColorActions(BASE_PARAMS));

		expect(itemKeys(result.current.sections)).toEqual(
			expect.arrayContaining(["edit", "duplicate", "variants", "delete"]),
		);
	});

	// La liste mobile n'affiche l'état que sous forme de badge en lecture seule :
	// sans cet item, activer/désactiver une couleur y était impossible (seul le
	// tableau desktop porte l'interrupteur). Le trou était masqué par un E2E qui
	// cherchait ce menuitem puis s'auto-skippait sur son absence.
	it("expose Désactiver quand la couleur est active", () => {
		const { result } = renderHook(() => useColorActions({ ...BASE_PARAMS, colorIsActive: true }));

		expect(findItem(result.current.sections, "toggle")?.label).toBe("Désactiver");
	});

	it("expose Activer quand la couleur est inactive", () => {
		const { result } = renderHook(() => useColorActions({ ...BASE_PARAMS, colorIsActive: false }));

		expect(findItem(result.current.sections, "toggle")?.label).toBe("Activer");
	});

	it("bascule vers l'état inverse au clic", () => {
		const { result } = renderHook(() => useColorActions({ ...BASE_PARAMS, colorIsActive: true }));

		findItem(result.current.sections, "toggle")?.onSelect?.();

		expect(mockToggleStatus).toHaveBeenCalledWith("color-1", false);
	});

	it("masque l'item quand l'état n'est pas connu de l'appelant", () => {
		// Aucune valeur par défaut : deviner un booléen afficherait le mauvais libellé.
		const { result } = renderHook(() => useColorActions(BASE_PARAMS));

		expect(findItem(result.current.sections, "toggle")).toBeUndefined();
	});
});
