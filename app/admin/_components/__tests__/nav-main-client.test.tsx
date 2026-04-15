import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUsePathname, mockIsRouteActive } = vi.hoisted(() => ({
	mockUsePathname: vi.fn(() => "/admin"),
	mockIsRouteActive: vi.fn(() => false),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

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

vi.mock("@/shared/lib/navigation", () => ({
	isRouteActive: mockIsRouteActive,
}));

vi.mock("@/shared/components/ui/sidebar", () => ({
	SidebarMenuButton: ({
		children,
		isActive,
		tooltip,
		className,
		asChild: _asChild,
		...rest
	}: {
		children: React.ReactNode;
		isActive?: boolean;
		tooltip?: string;
		className?: string;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (
		<div
			data-testid="sidebar-menu-button"
			data-active={isActive}
			title={tooltip}
			className={className}
			{...rest}
		>
			{children}
		</div>
	),
}));

import { NavMainClient } from "../nav-main-client";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("NavMainClient", () => {
	const defaultProps = {
		url: "/admin/ventes/commandes",
		tooltip: "Commandes",
		children: <span>Commandes</span>,
	};

	describe("rendering", () => {
		it("renders children inside a link", () => {
			render(<NavMainClient {...defaultProps} />);
			expect(screen.getByText("Commandes")).toBeInTheDocument();
		});

		it("renders link with correct href", () => {
			render(<NavMainClient {...defaultProps} />);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/admin/ventes/commandes");
		});

		it("passes tooltip to SidebarMenuButton", () => {
			render(<NavMainClient {...defaultProps} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("title", "Commandes");
		});
	});

	describe("active state", () => {
		it("calls isRouteActive with current pathname and url", () => {
			mockUsePathname.mockReturnValue("/admin/ventes/commandes");
			render(<NavMainClient {...defaultProps} />);
			expect(mockIsRouteActive).toHaveBeenCalledWith(
				"/admin/ventes/commandes",
				"/admin/ventes/commandes",
			);
		});

		it('sets aria-current="page" when active', () => {
			mockIsRouteActive.mockReturnValue(true);
			render(<NavMainClient {...defaultProps} />);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("aria-current", "page");
		});

		it("does not set aria-current when inactive", () => {
			mockIsRouteActive.mockReturnValue(false);
			render(<NavMainClient {...defaultProps} />);
			const link = screen.getByRole("link");
			expect(link).not.toHaveAttribute("aria-current");
		});

		it("passes isActive to SidebarMenuButton", () => {
			mockIsRouteActive.mockReturnValue(true);
			render(<NavMainClient {...defaultProps} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("data-active", "true");
		});

		it("passes isActive=false to SidebarMenuButton when inactive", () => {
			mockIsRouteActive.mockReturnValue(false);
			render(<NavMainClient {...defaultProps} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("data-active", "false");
		});
	});
});
