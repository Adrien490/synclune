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

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: mockUseDialog,
}));

vi.mock("@/shared/stores/use-overlay-stack-store", () => ({
	useHasOverlay: mockUseHasOverlay,
}));

vi.mock("@/shared/stores/use-admin-list-selection-store", () => ({}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/admin/catalogue/produits",
	// `GuardedLink` (utilisé à la place de next/link) appelle useRouter.
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
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
	bottomBarContainerClass: "container",
	bottomBarItemWrapperClass: "item-wrapper",
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
	/** Nom accessible de l'onglet Commandes (le compte y est replié). */
	const ordersTabName = () =>
		screen.getByRole("link", { name: /Commandes/i }).getAttribute("aria-label");

	it("rend « 1 commande en attente » (singulier) pour count=1", () => {
		render(<AdminMobileBottomBar badges={{ orders: 1 }} />);

		expect(ordersTabName()).toBe("Commandes, 1 commande en attente");
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("rend « N commandes en attente » (pluriel) pour count>=2", () => {
		render(<AdminMobileBottomBar badges={{ orders: 5 }} />);

		expect(ordersTabName()).toBe("Commandes, 5 commandes en attente");
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("clamp visuel « 99+ » mais garde le compte exact dans le label SR", () => {
		render(<AdminMobileBottomBar badges={{ orders: 250 }} />);

		expect(screen.getByText("99+")).toBeInTheDocument();
		expect(ordersTabName()).toBe("Commandes, 250 commandes en attente");
	});

	it("n'expose aucun badge pour count=0 ou orders undefined", () => {
		const { rerender } = render(<AdminMobileBottomBar badges={{ orders: 0 }} />);
		expect(ordersTabName()).toBeNull();
		expect(screen.queryByText("0")).not.toBeInTheDocument();

		rerender(<AdminMobileBottomBar badges={{}} />);
		expect(ordersTabName()).toBeNull();

		rerender(<AdminMobileBottomBar />);
		expect(ordersTabName()).toBeNull();
	});
});

/**
 * @regression bottom-bar-admin-badge-live-region
 *
 * La pastille portait elle-même `role="status" aria-live="polite"` mais n'était
 * rendue que si `count > 0` : la région naissait AVEC son texte, et une région
 * `aria-live` insérée en même temps que son contenu n'est pas vocalisée. La
 * transition 0→1 — l'arrivée d'une commande à traiter, la seule qui compte —
 * était donc muette (audit bottom-bar 2026-07-30, P2-4 ; même piège que celui
 * documenté dans `CountBadge`).
 */
describe("@regression AdminMobileBottomBar - annonce du badge", () => {
	const liveRegion = () => document.querySelector('[aria-live="polite"]');

	it("monte la région live dès le premier rendu, vide, même sans badge", () => {
		render(<AdminMobileBottomBar badges={{ orders: 0 }} />);

		expect(liveRegion()).not.toBeNull();
		expect(liveRegion()!.textContent).toBe("");
	});

	it("reste muette au premier rendu même quand un badge est déjà là", () => {
		// Un badge présent au montage n'est pas un événement : l'annoncer volerait
		// la parole au lecteur d'écran à chaque navigation admin.
		render(<AdminMobileBottomBar badges={{ orders: 3 }} />);

		expect(liveRegion()!.textContent).toBe("");
	});

	it("annonce la transition 0→N (le cas que l'ancienne pastille rendait muet)", () => {
		const { rerender } = render(<AdminMobileBottomBar badges={{ orders: 0 }} />);

		rerender(<AdminMobileBottomBar badges={{ orders: 1 }} />);

		expect(liveRegion()!.textContent).toBe("1 commande en attente");
	});

	it("annonce le retour à zéro", () => {
		const { rerender } = render(<AdminMobileBottomBar badges={{ orders: 2 }} />);

		rerender(<AdminMobileBottomBar badges={{ orders: 0 }} />);

		expect(liveRegion()!.textContent).toBe("Aucune commande en attente");
	});

	it("la pastille elle-même est décorative (pas de seconde région live)", () => {
		render(<AdminMobileBottomBar badges={{ orders: 7 }} />);

		// Le compte visuel ne doit pas être annoncé deux fois : une seule région.
		expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
		expect(screen.getByText("7").closest("[aria-hidden='true']")).not.toBeNull();
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

	// « Bottom nav tab change » = `selection` (règle haptique projet). Le bouton
	// Menu garde `light` : ce n'est pas un changement d'onglet mais l'ouverture
	// d'un drawer.
	it("déclenche haptic « selection » au clic d'un tab inactif", () => {
		render(<AdminMobileBottomBar />);

		fireEvent.click(screen.getByRole("link", { name: /Commandes/i }));

		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});
});
