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
	}: {
		children: React.ReactNode;
		preventDefault?: boolean;
		className?: string;
	}) => (
		<button data-testid="dropdown-item" role="menuitem" className={className}>
			{children}
		</button>
	),
	DropdownMenuLabel: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="dropdown-label" className={className}>
			{children}
		</div>
	),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
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

const defaultUser = { name: "Admin User", email: "admin@synclune.fr" };

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
			const names = screen.getAllByText("Admin User");
			expect(names.length).toBeGreaterThanOrEqual(1);
		});

		it("displays user email in trigger", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const emails = screen.getAllByText("admin@synclune.fr");
			expect(emails.length).toBeGreaterThanOrEqual(1);
		});

		it("renders chevrons icon", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-chevrons")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("renders trigger with aria-label", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByLabelText("Menu utilisateur de Admin User")).toBeInTheDocument();
		});

		it("renders chevrons with aria-hidden", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-chevrons")).toHaveAttribute("aria-hidden", "true");
		});

		it("renders logout icon with aria-hidden", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("icon-logout")).toHaveAttribute("aria-hidden", "true");
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
		it("shows user info in dropdown label", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			const label = screen.getByTestId("dropdown-label");
			expect(label).toHaveTextContent("Admin User");
			expect(label).toHaveTextContent("admin@synclune.fr");
		});

		it("renders separator", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
		});

		it("renders logout option", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByText("Déconnexion")).toBeInTheDocument();
		});

		it("wraps logout in LogoutAlertDialog", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("logout-alert-dialog")).toBeInTheDocument();
		});
	});

	describe("trigger button", () => {
		it("has size lg", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("data-size", "lg");
		});

		it("has user name as tooltip", () => {
			render(<SidebarFooterUser user={defaultUser} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("title", "Admin User");
		});
	});
});
