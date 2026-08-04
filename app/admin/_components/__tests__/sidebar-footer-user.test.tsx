import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMobile } = vi.hoisted(() => ({
	mockIsMobile: { current: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

const { mockOpenShortcuts } = vi.hoisted(() => ({ mockOpenShortcuts: vi.fn() }));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ isOpen: false, open: mockOpenShortcuts, close: vi.fn() }),
}));

vi.mock("@/shared/components/ui/kbd", () => ({
	Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
	KbdGroup: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		ChevronsUpDown: (props: Record<string, unknown>) => (
			<svg data-testid="icon-chevrons" {...props} />
		),
		LogOut: (props: Record<string, unknown>) => <svg data-testid="icon-logout" {...props} />,
	};
});

vi.mock("@/shared/components/ui/avatar", () => ({
	Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="avatar" className={className}>
			{children}
		</span>
	),
	AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
		// eslint-disable-next-line @next/next/no-img-element -- test mock for AvatarImage primitive
		<img data-testid="avatar-image" data-src={src ?? ""} alt={alt ?? ""} />
	),
	AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="avatar-fallback" className={className}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/sidebar", () => ({
	SidebarFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar-footer">{children}</div>
	),
	SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
	SidebarMenuButton: ({
		children,
		"aria-label": ariaLabel,
		tooltip,
		size,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		tooltip?: string;
		size?: string;
		className?: string;
	}) => (
		<button
			data-testid="sidebar-menu-button"
			aria-label={ariaLabel}
			title={tooltip}
			data-size={size}
			className={className}
		>
			{children}
		</button>
	),
	SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
	useSidebar: () => ({ isMobile: mockIsMobile.current }),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-menu">{children}</div>
	),
	DropdownMenuContent: ({
		children,
		side,
		align,
	}: {
		children: React.ReactNode;
		side?: string;
		align?: string;
		className?: string;
		sideOffset?: number;
	}) => (
		<div data-testid="dropdown-content" data-side={side} data-align={align}>
			{children}
		</div>
	),
	DropdownMenuItem: ({ variant, closeOnClick, ...props }: RenderPropMockProps) =>
		renderPropMock("button", {
			"data-testid": "dropdown-item",
			role: "menuitem",
			"data-variant": variant,
			// `preventDefault` (Radix) est devenu `closeOnClick={false}` (Base UI) ;
			// le testid reste le même pour ne pas réécrire les assertions.
			"data-prevent-default": closeOnClick === false ? "true" : undefined,
			...props,
		}),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuTrigger: (props: RenderPropMockProps) =>
		renderPropMock("div", { "data-testid": "dropdown-trigger", ...props }),
}));

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="logout-alert-dialog">{children}</div>
	),
}));

import { SidebarFooterUser } from "../sidebar-footer-user";

// ============================================================================
// SETUP
// ============================================================================

const defaultUser = { name: "Admin User", email: "admin@synclune.fr", image: null };

beforeEach(() => {
	vi.clearAllMocks();
	mockIsMobile.current = false;
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SidebarFooterUser", () => {
	describe("rendering", () => {
		it("renders in sidebar footer", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("sidebar-footer")).toBeInTheDocument();
		});

		it("displays user name in trigger", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByText("Admin User")).toBeInTheDocument();
		});

		it("displays user email in trigger", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByText("admin@synclune.fr")).toBeInTheDocument();
		});

		it("renders chevrons icon", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-chevrons")).toBeInTheDocument();
		});

		it("renders title attribute on email span for overflow fallback", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const email = screen.getByText("admin@synclune.fr");
			expect(email).toHaveAttribute("title", "admin@synclune.fr");
		});
	});

	describe("accessibility", () => {
		it("does not override accessible name with aria-label (relies on visible content)", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const trigger = screen.getByTestId("sidebar-menu-button");
			expect(trigger).not.toHaveAttribute("aria-label");
		});

		it("renders chevrons with aria-hidden", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-chevrons")).toHaveAttribute("aria-hidden", "true");
		});

		it("renders logout icon with aria-hidden", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-logout")).toHaveAttribute("aria-hidden", "true");
		});

		it("renders avatar image with empty alt (decorative, identity comes from text)", () => {
			render(<SidebarFooterUser user={{ ...defaultUser, image: "https://cdn.example/u.png" }} />);
			expect(screen.getByTestId("avatar-image")).toHaveAttribute("alt", "");
		});
	});

	describe("avatar", () => {
		it("renders avatar with image when provided", () => {
			render(<SidebarFooterUser user={{ ...defaultUser, image: "https://cdn.example/u.png" }} />);
			expect(screen.getByTestId("avatar-image")).toHaveAttribute(
				"data-src",
				"https://cdn.example/u.png",
			);
		});

		it("computes initials from two-part name", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("AU");
		});

		it("computes initials from single-word name", () => {
			render(<SidebarFooterUser user={{ name: "Synclune", email: "x@y.fr", image: null }} />);
			expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("SY");
		});

		it("falls back to email-based initials when name is empty", () => {
			render(<SidebarFooterUser user={{ name: "", email: "owner@synclune.fr", image: null }} />);
			expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("OW");
		});
	});

	describe("dropdown positioning", () => {
		it("positions dropdown to right on desktop", () => {
			mockIsMobile.current = false;
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("dropdown-content")).toHaveAttribute("data-side", "right");
		});

		it("positions dropdown to bottom on mobile", () => {
			mockIsMobile.current = true;
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("dropdown-content")).toHaveAttribute("data-side", "bottom");
		});
	});

	describe("dropdown content", () => {
		it("renders logout option", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByText("Déconnexion")).toBeInTheDocument();
		});

		it("wraps logout in LogoutAlertDialog", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("logout-alert-dialog")).toBeInTheDocument();
		});

		// Le menu contient désormais plusieurs items (raccourcis + déconnexion) :
		// cibler l'item par son libellé plutôt que par `getByTestId` au singulier.
		function logoutItem() {
			return screen.getByRole("menuitem", { name: /Déconnexion/ });
		}

		it("applies destructive variant to logout item", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(logoutItem()).toHaveAttribute("data-variant", "destructive");
		});

		it("uses preventDefault on logout item to defer close to AlertDialog", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(logoutItem()).toHaveAttribute("data-prevent-default", "true");
		});
	});

	/**
	 * L'aide raccourcis n'était atteignable que par une icône du header desktop
	 * (fonction révélée au survol seulement) ou en connaissant `?` d'avance.
	 */
	describe("entrée « Raccourcis clavier »", () => {
		it("expose une entrée nommée dans le menu utilisateur", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByRole("menuitem", { name: /Raccourcis clavier/ })).toBeInTheDocument();
		});

		it("affiche le raccourci ? à côté du libellé", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const item = screen.getByRole("menuitem", { name: /Raccourcis clavier/ });
			expect(item.textContent).toContain("?");
		});

		it("ouvre le dialogue de raccourcis à la sélection", async () => {
			const { default: userEvent } = await import("@testing-library/user-event");
			const user = userEvent.setup();
			render(<SidebarFooterUser user={defaultUser} />);

			await user.click(screen.getByRole("menuitem", { name: /Raccourcis clavier/ }));

			expect(mockOpenShortcuts).toHaveBeenCalled();
		});

		it("n'est pas marquée destructive (ce n'est pas la déconnexion)", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const item = screen.getByRole("menuitem", { name: /Raccourcis clavier/ });
			expect(item).not.toHaveAttribute("data-variant", "destructive");
		});
	});

	describe("trigger button", () => {
		it("has size lg", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("data-size", "lg");
		});

		it("has user name as tooltip for collapsed icon-only mode", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("title", "Admin User");
		});
	});
});
