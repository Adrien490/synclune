import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		ChevronRight: (props: Record<string, unknown>) => <svg data-testid="chevron-icon" {...props} />,
	};
});

vi.mock("@/shared/components/ui/collapsible", () => ({
	Collapsible: ({
		children,
		defaultOpen,
	}: {
		children: React.ReactNode;
		defaultOpen?: boolean;
		className?: string;
	}) => (
		<div data-testid="collapsible" data-default-open={defaultOpen}>
			{children}
		</div>
	),
	CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="collapsible-content">{children}</div>
	),
	CollapsibleTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="collapsible-trigger">{children}</div>,
}));

vi.mock("@/shared/components/ui/sidebar", () => ({
	SidebarGroup: ({
		children,
		role,
		"aria-labelledby": ariaLabelledBy,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-labelledby"?: string;
	}) => (
		<div data-testid="sidebar-group" role={role} aria-labelledby={ariaLabelledBy}>
			{children}
		</div>
	),
	SidebarGroupLabel: ({
		children,
		id,
		className,
	}: {
		children: React.ReactNode;
		id?: string;
		className?: string;
	}) => (
		<div data-testid="sidebar-group-label" id={id} className={className}>
			{children}
		</div>
	),
	SidebarMenu: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<ul data-testid="sidebar-menu" className={className} aria-label={ariaLabel}>
			{children}
		</ul>
	),
	SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
		<li data-testid="sidebar-menu-item">{children}</li>
	),
}));

vi.mock("../nav-main-client", () => ({
	NavMainClient: ({
		children,
		url,
		tooltip,
	}: {
		children: React.ReactNode;
		url: string;
		tooltip: string;
	}) => (
		<div data-testid="nav-main-client" data-url={url} data-tooltip={tooltip}>
			{children}
		</div>
	),
}));

import { CollapsibleNavGroup } from "../collapsible-nav-group";

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

describe("CollapsibleNavGroup", () => {
	describe("rendering", () => {
		it("renders null when group label is not found", () => {
			const { container } = render(
				<CollapsibleNavGroup groupLabel="Nonexistent" groupId="nonexistent" />,
			);
			expect(container.innerHTML).toBe("");
		});

		it("renders the group when label matches", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("collapsible")).toBeInTheDocument();
		});

		it("renders with defaultOpen", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-default-open", "true");
		});

		it("renders the group label text", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
		});
	});

	describe("accessibility", () => {
		it("sets aria-labelledby on SidebarGroup", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-group")).toHaveAttribute(
				"aria-labelledby",
				"catalogue-group",
			);
		});

		it("sets role=group on SidebarGroup", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-group")).toHaveAttribute("role", "group");
		});

		it("sets id on SidebarGroupLabel", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-group-label")).toHaveAttribute("id", "catalogue-group");
		});

		it("renders chevron icon with aria-hidden", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("chevron-icon")).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("navigation items", () => {
		it("renders all items in the Catalogue group", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			const items = screen.getAllByTestId("nav-main-client");
			expect(items.length).toBe(5); // Produits, Collections, Types, Couleurs, Matériaux
		});

		it("returns null when group label does not match any nav group", () => {
			const { container } = render(
				<CollapsibleNavGroup groupLabel="GroupeInexistant" groupId="ghost-group" />,
			);
			expect(container.innerHTML).toBe("");
		});

		it("passes correct url and tooltip to NavMainClient", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			const items = screen.getAllByTestId("nav-main-client");
			expect(items[0]).toHaveAttribute("data-url", "/admin/catalogue/produits");
			expect(items[0]).toHaveAttribute("data-tooltip", "Produits");
		});

		it("renders item titles as text", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByText("Collections")).toBeInTheDocument();
		});

		it("sets aria-label on SidebarMenu", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-menu")).toHaveAttribute("aria-label", "Catalogue");
		});
	});
});
