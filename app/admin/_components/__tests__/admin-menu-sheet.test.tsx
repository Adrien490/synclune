import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockOpenMenu, mockCloseMenu, mockUsePathname, mockTriggerHaptic } = vi.hoisted(
	() => ({
		mockIsOpen: { current: false },
		mockOpenMenu: vi.fn(),
		mockCloseMenu: vi.fn(),
		mockUsePathname: vi.fn(() => "/admin"),
		mockTriggerHaptic: vi.fn(),
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		ExternalLink: (props: Record<string, unknown>) => (
			<svg data-testid="icon-external-link" {...props} />
		),
		LogOut: (props: Record<string, unknown>) => <svg data-testid="icon-logout" {...props} />,
	};
});

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
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

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.current,
		open: mockOpenMenu,
		close: mockCloseMenu,
	}),
}));

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: (pathname: string, url: string) =>
		pathname === url || pathname.startsWith(url + "/"),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string")
			.join(" "),
}));

vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({
		children,
		open,
		onOpenChange,
		handleOnly,
		scrollLockTimeout,
	}: {
		children: React.ReactNode;
		open: boolean;
		direction?: string;
		onOpenChange?: (v: boolean) => void;
		preventScrollRestoration?: boolean;
		handleOnly?: boolean;
		scrollLockTimeout?: number;
	}) =>
		open ? (
			<div
				data-testid="sheet"
				data-handle-only={handleOnly ? "true" : "false"}
				data-scroll-lock-timeout={scrollLockTimeout ?? ""}
			>
				<button type="button" data-testid="sheet-dismiss" onClick={() => onOpenChange?.(false)}>
					dismiss
				</button>
				{children}
			</div>
		) : null,
	SheetContent: ({
		children,
		className,
		id,
		onOverlayClick,
	}: {
		children: React.ReactNode;
		className?: string;
		id?: string;
		onOverlayClick?: (e: React.MouseEvent) => void;
	}) => (
		<div data-testid="sheet-content" data-slot="sheet-content" id={id} className={className}>
			<div data-testid="sheet-overlay" onClick={(e) => onOverlayClick?.(e)} aria-hidden="true" />
			{children}
		</div>
	),
	SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-header" className={className}>
			{children}
		</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	SheetHandle: ({ className }: { className?: string }) => (
		<div data-testid="sheet-handle" className={className} />
	),
}));

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({
		open,
		onOpenChange,
	}: {
		open: boolean;
		onOpenChange: (v: boolean) => void;
	}) =>
		open ? (
			<div data-testid="logout-dialog">
				<button onClick={() => onOpenChange(false)}>Cancel</button>
			</div>
		) : null,
}));

import { AdminMenuSheet } from "../admin-menu-sheet";

// ============================================================================
// SETUP
// ============================================================================

const defaultUser = { name: "Admin User", email: "admin@synclune.fr" };

beforeEach(() => {
	vi.clearAllMocks();
	mockIsOpen.current = false;
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AdminMenuSheet", () => {
	describe("when closed", () => {
		it("does not render sheet content", () => {
			mockIsOpen.current = false;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
		});
	});

	describe("when open", () => {
		beforeEach(() => {
			mockIsOpen.current = true;
		});

		it("renders the sheet", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByTestId("sheet")).toBeInTheDocument();
		});

		it("displays user name", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Admin User")).toBeInTheDocument();
		});

		it("displays user email", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("admin@synclune.fr")).toBeInTheDocument();
		});

		it("renders search input", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByLabelText("Filtrer les pages de navigation")).toBeInTheDocument();
		});

		it("renders dashboard link", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
		});

		it("renders navigation groups (shop-live mode)", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
			expect(screen.getByText("Configuration")).toBeInTheDocument();
			// Visibles en mode boutique en ligne (SHOP_LIVE=true)
			expect(screen.getByText("Ventes")).toBeInTheDocument();
			expect(screen.getByText("Marketing")).toBeInTheDocument();
		});

		it('sets aria-label="Navigation administration" on nav', () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const nav = screen.getByLabelText("Navigation administration");
			expect(nav).toBeInTheDocument();
		});

		it("renders navigation items (shop-live mode)", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByText("Boutique")).toBeInTheDocument();
			// Visible en mode boutique en ligne
			expect(screen.getByText("Commandes")).toBeInTheDocument();
		});

		it("marks active route with aria-current", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<AdminMenuSheet user={defaultUser} />);
			const activeLink = screen.getByRole("link", { name: /Produits/i });
			expect(activeLink).toHaveAttribute("aria-current", "page");
		});

		it("renders external link to site", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByLabelText("Voir le site (nouvel onglet)");
			expect(link).toHaveAttribute("href", "/");
			expect(link).toHaveAttribute("target", "_blank");
		});
	});

	describe("badges", () => {
		// Badges are keyed by item.id. In shop-closed mode "orders" is hidden, so
		// these tests use "products" (always visible) to exercise the rendering logic.
		it("displays badge count on items", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 5 }} />);
			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("caps badge at 99+", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 150 }} />);
			expect(screen.getByText("99+")).toBeInTheDocument();
		});

		it("does not show badge when count is 0", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ products: 0 }} />);
			expect(screen.queryByText("0")).not.toBeInTheDocument();
		});
	});

	describe("logout flow", () => {
		it("shows logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Déconnexion")).toBeInTheDocument();
		});

		it("closes menu on logout click", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockCloseMenu).toHaveBeenCalled();
		});

		it('triggers "medium" haptic on logout click (destructive action)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});

		it("defers the logout dialog until after the sheet has finished closing", () => {
			mockIsOpen.current = true;
			const { rerender } = render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByText("Déconnexion"));
			expect(mockCloseMenu).toHaveBeenCalled();
			// Dialog ne s'ouvre PAS immédiatement (tant que la sheet est ouverte)
			expect(screen.queryByTestId("logout-dialog")).not.toBeInTheDocument();

			// Simule la fermeture effective de la sheet par Vaul
			mockIsOpen.current = false;
			rerender(<AdminMenuSheet user={defaultUser} />);
			// Toujours pas visible : le timer fallback n'a pas encore tiré
			expect(screen.queryByTestId("logout-dialog")).not.toBeInTheDocument();

			// Fallback timer (VAUL_EXIT_DURATION_MS = 450)
			vi.advanceTimersByTime(450);
			rerender(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByTestId("logout-dialog")).toBeInTheDocument();
		});
	});

	describe("sheet title", () => {
		it("renders accessible title", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Menu d'administration")).toBeInTheDocument();
		});
	});

	describe("search differentiation (P1.4)", () => {
		it('uses "Filtrer les pages" placeholder (not generic search)', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			expect(input).toHaveAttribute("placeholder", "Filtrer les pages…");
		});
	});

	describe("aria-live search results (P1.5)", () => {
		it("announces empty state via aria-live polite", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "xyznope" } });

			const statusNodes = screen.getAllByRole("status");
			const liveMessage = statusNodes.find((n) => n.textContent.includes("Aucun résultat"));
			expect(liveMessage).toBeDefined();
			expect(liveMessage).toHaveAttribute("aria-live", "polite");
		});

		it("labels results region with count", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });

			const region = screen.getByRole("region");
			expect(region.getAttribute("aria-label")).toMatch(/résultats? de navigation/);
		});
	});

	describe("scroll fade (P2.4)", () => {
		it("wraps nav in ScrollFade with vertical axis and fadeFromClass=from-muted", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			const scrollFadeRoot = screen.getByTestId("scroll-fade-root");
			expect(scrollFadeRoot).toBeInTheDocument();

			const scrollContainer = screen.getByTestId("scroll-fade-container");
			// ScrollFade vertical axis gives h-full + overflow-y-auto
			expect(scrollContainer.className).toContain("overflow-y-auto");
			// overscroll-contain passed through via className
			expect(scrollContainer.className).toContain("overscroll-contain");
		});

		it("nav is inside scroll-fade container (landmark preserved)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			const nav = screen.getByLabelText("Navigation administration");
			const scrollContainer = screen.getByTestId("scroll-fade-container");
			expect(scrollContainer.contains(nav)).toBe(true);
		});
	});

	describe("haptic feedback (P1.3)", () => {
		it('fires "selection" haptic on dismiss', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByTestId("sheet-dismiss"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic on scrim tap', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByTestId("sheet-overlay"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});
	});

	describe("vaul gestures", () => {
		it("activates handleOnly on the bottom Sheet (forces drag-handle to close the long nav list)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const sheet = screen.getByTestId("sheet");
			expect(sheet).toHaveAttribute("data-handle-only", "true");
		});

		it("passes scrollLockTimeout=500 to Sheet (P1.3 — drag-to-close reactivity after scroll)", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const sheet = screen.getByTestId("sheet");
			expect(sheet).toHaveAttribute("data-scroll-lock-timeout", "500");
		});
	});

	describe("sheet content id (P0 — aria-controls target)", () => {
		it("renders SheetContent with the stable id used by the bottom-bar trigger", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const content = screen.getByTestId("sheet-content");
			expect(content).toHaveAttribute("id", "admin-menu-sheet-content");
			expect(content).toHaveAttribute("data-slot", "sheet-content");
		});
	});

	describe("opening live region (P1.3)", () => {
		it("announces 'Menu ouvert, N options de navigation' on open", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const statusNodes = screen.getAllByRole("status");
			const opening = statusNodes.find((n) => n.textContent.includes("Menu ouvert"));
			expect(opening).toBeDefined();
			expect(opening?.textContent).toMatch(/Menu ouvert, \d+ options? de navigation/);
			expect(opening).toHaveAttribute("aria-live", "polite");
		});

		it("hides the opening live region while searching", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });

			const statusNodes = screen.queryAllByRole("status");
			const opening = statusNodes.find((n) => n.textContent.includes("Menu ouvert"));
			expect(opening).toBeUndefined();
		});
	});

	describe("search live region enriched (P1.3)", () => {
		it("uses 'résultats de navigation' qualifier in the count region", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "command" } });

			const statusNodes = screen.getAllByRole("status");
			const liveCount = statusNodes.find((n) => /\d+ résultats? de navigation/.test(n.textContent));
			expect(liveCount).toBeDefined();
			expect(liveCount).toHaveAttribute("aria-live", "polite");
		});

		it("wraps the search query in French chevrons in the empty live region", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const input = screen.getByLabelText("Filtrer les pages de navigation");
			fireEvent.change(input, { target: { value: "zzzz" } });

			const statusNodes = screen.getAllByRole("status");
			const empty = statusNodes.find((n) => /Aucun résultat pour « zzzz »/.test(n.textContent));
			expect(empty).toBeDefined();
		});
	});

	describe("nav item haptic feedback (P1.2)", () => {
		it('fires "selection" haptic when clicking the dashboard link', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByRole("link", { name: /Tableau de bord/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic when clicking a group navigation link', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByRole("link", { name: /Produits/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it('fires "selection" haptic when clicking "Voir le site"', () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			mockTriggerHaptic.mockClear();

			fireEvent.click(screen.getByLabelText("Voir le site (nouvel onglet)"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});
	});

	describe("tactile classes (P1.2)", () => {
		it("applies touch-manipulation + motion-safe scale on group nav links", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Produits/i });
			expect(link.className).toContain("touch-manipulation");
			expect(link.className).toContain("motion-safe:active:scale-[0.97]");
		});

		it("applies tactile classes on the dashboard link", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const link = screen.getByRole("link", { name: /Tableau de bord/i });
			expect(link.className).toContain("touch-manipulation");
			expect(link.className).toContain("motion-safe:active:scale-[0.97]");
		});

		it("applies tactile classes on the logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			const btn = screen.getByText("Déconnexion").closest("button")!;
			expect(btn.className).toContain("touch-manipulation");
			expect(btn.className).toContain("motion-safe:active:scale-[0.97]");
		});
	});
});
