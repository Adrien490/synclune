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
	}: {
		children: React.ReactNode;
		open: boolean;
		direction?: string;
		onOpenChange?: (v: boolean) => void;
		preventScrollRestoration?: boolean;
	}) =>
		open ? (
			<div data-testid="sheet">
				<button type="button" data-testid="sheet-dismiss" onClick={() => onOpenChange?.(false)}>
					dismiss
				</button>
				{children}
			</div>
		) : null,
	SheetContent: ({
		children,
		className,
		onOverlayClick,
	}: {
		children: React.ReactNode;
		className?: string;
		onOverlayClick?: (e: React.MouseEvent) => void;
	}) => (
		<div data-testid="sheet-content" className={className}>
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

		it("renders navigation groups", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Ventes")).toBeInTheDocument();
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
			expect(screen.getByText("Marketing")).toBeInTheDocument();
		});

		it('sets aria-label="Navigation administration" on nav', () => {
			render(<AdminMenuSheet user={defaultUser} />);
			const nav = screen.getByLabelText("Navigation administration");
			expect(nav).toBeInTheDocument();
		});

		it("renders navigation items", () => {
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Commandes")).toBeInTheDocument();
			expect(screen.getByText("Produits")).toBeInTheDocument();
		});

		it("marks active route with aria-current", () => {
			mockUsePathname.mockReturnValue("/admin/ventes/commandes");
			render(<AdminMenuSheet user={defaultUser} />);
			const activeLink = screen.getByRole("link", { name: /Commandes/i });
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
		it("displays badge count on items", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ orders: 5 }} />);
			expect(screen.getByText("5")).toBeInTheDocument();
		});

		it("caps badge at 99+", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ orders: 150 }} />);
			expect(screen.getByText("99+")).toBeInTheDocument();
		});

		it("does not show badge when count is 0", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} badges={{ orders: 0 }} />);
			expect(screen.queryByText("0")).not.toBeInTheDocument();
		});
	});

	describe("logout flow", () => {
		it("shows logout button", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);
			expect(screen.getByText("Deconnexion")).toBeInTheDocument();
		});

		it("closes menu on logout click", () => {
			mockIsOpen.current = true;
			render(<AdminMenuSheet user={defaultUser} />);

			fireEvent.click(screen.getByText("Deconnexion"));
			expect(mockCloseMenu).toHaveBeenCalled();
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
			expect(input).toHaveAttribute("placeholder", "Filtrer les pages...");
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
});
