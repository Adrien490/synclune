import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	DropdownMenuItem: ({
		children,
		className,
		variant,
		preventDefault,
	}: {
		children: React.ReactNode;
		preventDefault?: boolean;
		variant?: "default" | "destructive";
		className?: string;
	}) => (
		<button
			data-testid="dropdown-item"
			role="menuitem"
			className={className}
			data-variant={variant}
			data-prevent-default={preventDefault ? "true" : undefined}
		>
			{children}
		</button>
	),
	DropdownMenuTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="dropdown-trigger">{children}</div>,
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

		it("applies destructive variant to logout item", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("dropdown-item")).toHaveAttribute("data-variant", "destructive");
		});

		it("uses preventDefault on logout item to defer close to AlertDialog", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("dropdown-item")).toHaveAttribute("data-prevent-default", "true");
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
