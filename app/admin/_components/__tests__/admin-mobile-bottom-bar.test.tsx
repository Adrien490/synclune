import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactDomModule from "react-dom";

import type { AdminListSelectionControl } from "@/shared/types/store.types";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsRouteActive,
	mockTriggerHaptic,
	mockUseMounted,
	mockUseDialog,
	mockUseHasOverlay,
	mockUseAdminListSelectionStore,
	mockEnter,
	mockExit,
} = vi.hoisted(() => ({
	mockIsRouteActive: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockUseMounted: vi.fn(),
	mockUseDialog: vi.fn(),
	mockUseHasOverlay: vi.fn(),
	mockUseAdminListSelectionStore: vi.fn(),
	mockEnter: vi.fn(),
	mockExit: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("react-dom", async () => {
	const actual = await vi.importActual<typeof ReactDomModule>("react-dom");
	return {
		...actual,
		createPortal: (children: React.ReactNode) => children,
	};
});

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: mockIsRouteActive,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/hooks/use-mounted", () => ({
	useMounted: mockUseMounted,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/shared/stores/use-overlay-stack-store", () => ({
	useHasOverlay: mockUseHasOverlay,
}));

vi.mock("@/shared/stores/use-admin-list-selection-store", () => ({
	useAdminListSelectionStore: mockUseAdminListSelectionStore,
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/admin/catalogue/produits",
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		"aria-label": ariaLabel,
		isHidden,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		isHidden?: boolean;
	}) => (
		<nav aria-label={ariaLabel} data-hidden={isHidden ? "true" : "false"}>
			{children}
		</nav>
	),
	BottomBarActivePill: () => <span data-testid="active-pill" />,
	bottomBarContainerClass: "container",
	bottomBarItemClass: "item",
	bottomBarActiveItemClass: "active",
	bottomBarIconClass: "icon",
	bottomBarLabelClass: "label",
	bottomBarBadgeClass: "badge",
}));

// Import AFTER mocks
import { AdminMobileBottomBar } from "../admin-mobile-bottom-bar";

// ============================================================================
// HELPERS
// ============================================================================

function makeControl(
	overrides: Partial<AdminListSelectionControl> = {},
): AdminListSelectionControl {
	return {
		selectionMode: false,
		pageHasItems: true,
		enter: mockEnter,
		exit: mockExit,
		...overrides,
	};
}

function setStoreSelector(control: AdminListSelectionControl | null) {
	// Reproduit le pattern useStore((s) => s.control) en évaluant la fonction
	// de selector côté mock avec un state minimal.
	mockUseAdminListSelectionStore.mockImplementation(
		(selector: (state: { control: AdminListSelectionControl | null }) => unknown) =>
			selector({ control }),
	);
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockIsRouteActive.mockReturnValue(false);
	mockUseMounted.mockReturnValue(true);
	mockUseDialog.mockReturnValue({ isOpen: false, open: vi.fn(), close: vi.fn() });
	mockUseHasOverlay.mockReturnValue(false);
	setStoreSelector(null);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMobileBottomBar - tab Sélection", () => {
	it("ne rend pas le tab Sélection quand aucun BulkSelectionProvider monté (control === null)", () => {
		setStoreSelector(null);

		render(<AdminMobileBottomBar />);

		expect(screen.queryByLabelText("Activer le mode sélection")).not.toBeInTheDocument();
	});

	it("ne rend pas le tab Sélection quand la liste est vide (pageHasItems === false)", () => {
		setStoreSelector(makeControl({ pageHasItems: false }));

		render(<AdminMobileBottomBar />);

		expect(screen.queryByLabelText("Activer le mode sélection")).not.toBeInTheDocument();
	});

	it("ne rend pas le tab Sélection quand le mode sélection est déjà actif (la bottom-bar globale est cachée de toute façon)", () => {
		setStoreSelector(makeControl({ selectionMode: true }));

		render(<AdminMobileBottomBar />);

		expect(screen.queryByLabelText("Activer le mode sélection")).not.toBeInTheDocument();
	});

	it("rend le tab Sélection quand pageHasItems && !selectionMode", () => {
		setStoreSelector(makeControl());

		render(<AdminMobileBottomBar />);

		expect(screen.getByLabelText("Activer le mode sélection")).toBeInTheDocument();
		expect(screen.getByText("Sélection")).toBeInTheDocument();
	});

	it("déclenche haptic « selection » + control.enter() au clic sur le tab", () => {
		setStoreSelector(makeControl());

		render(<AdminMobileBottomBar />);

		fireEvent.click(screen.getByLabelText("Activer le mode sélection"));

		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		expect(mockEnter).toHaveBeenCalledTimes(1);
	});

	it("cache la bottom-bar globale (isHidden) quand le mode sélection est actif", () => {
		setStoreSelector(makeControl({ selectionMode: true }));

		render(<AdminMobileBottomBar />);

		const nav = screen.getByLabelText("Navigation principale administration");
		expect(nav).toHaveAttribute("data-hidden", "true");
	});

	it("garde la bottom-bar globale visible hors mode sélection", () => {
		setStoreSelector(makeControl());

		render(<AdminMobileBottomBar />);

		const nav = screen.getByLabelText("Navigation principale administration");
		expect(nav).toHaveAttribute("data-hidden", "false");
	});
});

describe("AdminMobileBottomBar - bouton Menu (a11y trigger ↔ sheet)", () => {
	it("expose aria-controls pointant vers l'id stable de la SheetContent admin", () => {
		render(<AdminMobileBottomBar />);

		const trigger = screen.getByLabelText("Menu de navigation");
		expect(trigger).toHaveAttribute("aria-controls", "admin-menu-sheet-content");
	});

	it("garde un aria-label stable, l'état ouvert/fermé étant porté par aria-expanded", () => {
		// État fermé
		mockUseDialog.mockReturnValue({ isOpen: false, open: vi.fn(), close: vi.fn() });
		const { rerender } = render(<AdminMobileBottomBar />);
		let trigger = screen.getByLabelText("Menu de navigation");
		expect(trigger).toHaveAttribute("aria-label", "Menu de navigation");
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		// État ouvert
		mockUseDialog.mockReturnValue({ isOpen: true, open: vi.fn(), close: vi.fn() });
		rerender(<AdminMobileBottomBar />);
		trigger = screen.getByLabelText("Menu de navigation");
		expect(trigger).toHaveAttribute("aria-label", "Menu de navigation");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	it("annonce le rôle de dialogue via aria-haspopup", () => {
		render(<AdminMobileBottomBar />);

		const trigger = screen.getByLabelText("Menu de navigation");
		expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
	});

	it("déclenche haptic « light » au clic sur le bouton Menu", () => {
		const openMock = vi.fn();
		mockUseDialog.mockReturnValue({ isOpen: false, open: openMock, close: vi.fn() });

		render(<AdminMobileBottomBar />);

		fireEvent.click(screen.getByLabelText("Menu de navigation"));

		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
		expect(openMock).toHaveBeenCalledTimes(1);
	});
});
