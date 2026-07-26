import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactDomModule from "react-dom";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockIsRouteActive,
	mockTriggerHaptic,
	mockUseMounted,
	mockUseDialog,
	mockUseHasOverlay,
	mockEnter,
	mockExit,
} = vi.hoisted(() => ({
	mockIsRouteActive: vi.fn(),
	mockTriggerHaptic: vi.fn(),
	mockUseMounted: vi.fn(),
	mockUseDialog: vi.fn(),
	mockUseHasOverlay: vi.fn(),
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

vi.mock("@/shared/stores/use-admin-list-selection-store", () => ({}));

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
	useLinkStatus: () => ({ pending: false }),
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

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockIsRouteActive.mockReturnValue(false);
	mockUseMounted.mockReturnValue(true);
	mockUseDialog.mockReturnValue({ isOpen: false, open: vi.fn(), close: vi.fn() });
	mockUseHasOverlay.mockReturnValue(false);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

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

describe("AdminMobileBottomBar - badge orders pluralisé", () => {
	it("rend « 1 commande en attente » (singulier) pour count=1", () => {
		render(<AdminMobileBottomBar badges={{ orders: 1 }} />);

		expect(screen.getByLabelText("1 commande en attente")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("rend « N commandes en attente » (pluriel) pour count>=2", () => {
		render(<AdminMobileBottomBar badges={{ orders: 5 }} />);

		expect(screen.getByLabelText("5 commandes en attente")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("clamp visuel « 99+ » mais garde le compte exact dans le label SR", () => {
		render(<AdminMobileBottomBar badges={{ orders: 250 }} />);

		expect(screen.getByText("99+")).toBeInTheDocument();
		expect(screen.getByLabelText("250 commandes en attente")).toBeInTheDocument();
	});

	it("n'expose aucun badge pour count=0 ou orders undefined", () => {
		const { rerender } = render(<AdminMobileBottomBar badges={{ orders: 0 }} />);
		expect(screen.queryByLabelText(/commande/)).not.toBeInTheDocument();

		rerender(<AdminMobileBottomBar badges={{}} />);
		expect(screen.queryByLabelText(/commande/)).not.toBeInTheDocument();

		rerender(<AdminMobileBottomBar />);
		expect(screen.queryByLabelText(/commande/)).not.toBeInTheDocument();
	});
});

describe("AdminMobileBottomBar - masquage via overlay stack", () => {
	it("cache la bottom-bar (isHidden) quand un overlay du stack est ouvert", () => {
		mockUseHasOverlay.mockReturnValue(true);

		render(<AdminMobileBottomBar />);

		const nav = screen.getByLabelText("Navigation principale administration");
		expect(nav).toHaveAttribute("data-hidden", "true");
	});
});

describe("AdminMobileBottomBar - aria-current convention", () => {
	it("pose aria-current='page' sur le tab actif", () => {
		mockIsRouteActive.mockImplementation(
			(_p: string, url: string) => url === "/admin/ventes/commandes",
		);

		render(<AdminMobileBottomBar />);

		expect(screen.getByRole("link", { name: /Commandes/i })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	it("omet aria-current sur les tabs inactifs (pas 'false')", () => {
		render(<AdminMobileBottomBar />);

		expect(screen.getByRole("link", { name: /Produits/i })).not.toHaveAttribute("aria-current");
	});
});

describe("AdminMobileBottomBar - haptic policy", () => {
	it("ne déclenche pas de haptic au clic d'un tab déjà actif", () => {
		mockIsRouteActive.mockImplementation((_p: string, url: string) => url === "/admin");

		render(<AdminMobileBottomBar />);

		fireEvent.click(screen.getByRole("link", { name: /Accueil/i }));

		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});

	it("déclenche haptic « light » au clic d'un tab inactif", () => {
		render(<AdminMobileBottomBar />);

		fireEvent.click(screen.getByRole("link", { name: /Commandes/i }));

		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});
});
