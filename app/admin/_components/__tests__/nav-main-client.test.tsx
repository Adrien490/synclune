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
	useLinkStatus: () => ({ pending: false }),
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
	SidebarMenuBadge: ({
		children,
		className,
		...rest
	}: {
		children: React.ReactNode;
		className?: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="sidebar-menu-badge" className={className} {...rest}>
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

		it("locks active styling classes (regression: highlight bg + icon color)", () => {
			mockIsRouteActive.mockReturnValue(true);
			render(<NavMainClient {...defaultProps} />);
			const button = screen.getByTestId("sidebar-menu-button");
			expect(button.className).toMatch(/data-\[active=true\]:bg-primary\/10/);
			expect(button.className).toMatch(/data-\[active=true\]:\[&_svg\]:text-primary/);
			expect(button.className).toMatch(/motion-safe:before:transition-opacity/);
		});
	});

	describe("badge (N1 — parité compteurs desktop)", () => {
		it("does not render a badge when badge is undefined", () => {
			render(<NavMainClient {...defaultProps} />);
			expect(screen.queryByTestId("sidebar-menu-badge")).not.toBeInTheDocument();
		});

		it("does not render a badge when badge is 0", () => {
			render(<NavMainClient {...defaultProps} badge={0} />);
			expect(screen.queryByTestId("sidebar-menu-badge")).not.toBeInTheDocument();
		});

		it("renders the count when badge > 0 (visual badge is decorative)", () => {
			render(<NavMainClient {...defaultProps} badge={5} />);
			const badge = screen.getByTestId("sidebar-menu-badge");
			expect(badge).toHaveTextContent("5");
			// Le badge visuel est aria-hidden : l'info passe par le nom du lien.
			expect(badge).toHaveAttribute("aria-hidden", "true");
		});

		it("exposes the count inside the link's accessible name", () => {
			render(<NavMainClient {...defaultProps} badge={5} />);
			// Le nom du lien combine le label visible + le sr-only.
			expect(screen.getByRole("link", { name: /Commandes.*5 en attente/ })).toBeInTheDocument();
		});

		it('clamps the visual count to "99+" while keeping the exact count in the name', () => {
			render(<NavMainClient {...defaultProps} badge={250} />);
			expect(screen.getByTestId("sidebar-menu-badge")).toHaveTextContent("99+");
			expect(screen.getByRole("link", { name: /Commandes.*250 en attente/ })).toBeInTheDocument();
		});

		it("renders the collapsed-mode alert dot (N2) only when badged", () => {
			const { container, rerender } = render(<NavMainClient {...defaultProps} />);
			expect(
				container.querySelector("span.group-data-\\[collapsible\\=icon\\]\\:block"),
			).not.toBeInTheDocument();

			rerender(<NavMainClient {...defaultProps} badge={3} />);
			expect(
				container.querySelector("span.group-data-\\[collapsible\\=icon\\]\\:block"),
			).toBeInTheDocument();
		});

		it("enriches the tooltip with the pending count when badged (N3)", () => {
			render(<NavMainClient {...defaultProps} badge={3} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute(
				"title",
				"Commandes (3 en attente)",
			);
		});

		it("keeps the plain tooltip when not badged", () => {
			render(<NavMainClient {...defaultProps} />);
			expect(screen.getByTestId("sidebar-menu-button")).toHaveAttribute("title", "Commandes");
		});
	});
});
