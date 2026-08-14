import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// MODULE MOCKS
// ============================================================================

const { mockUsePathname } = vi.hoisted(() => ({
	mockUsePathname: vi.fn(() => "/admin"),
}));

vi.mock("next/navigation", () => ({
	usePathname: mockUsePathname,
}));

vi.mock("@phosphor-icons/react/ssr", async (importOriginal) => {
	const actual = await importOriginal<typeof PhosphorIcons>();
	return {
		...actual,
		CaretRightIcon: (props: Record<string, unknown>) => (
			<svg data-testid="chevron-icon" {...props} />
		),
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
	CollapsibleTrigger: (props: RenderPropMockProps) =>
		renderPropMock("div", { "data-testid": "collapsible-trigger", ...props }),
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
		role,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		role?: string;
		"aria-label"?: string;
	}) => (
		<ul data-testid="sidebar-menu" className={className} role={role} aria-label={ariaLabel}>
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
import type * as PhosphorIcons from "@phosphor-icons/react/ssr";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockUsePathname.mockReturnValue("/admin");
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

		it("s'ouvre par défaut quand la route courante appartient au groupe", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-default-open", "true");
		});

		it("s'ouvre aussi sur une sous-route d'un item du groupe (fiche produit)", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/bague-lune");
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-default-open", "true");
		});

		it("reste replié quand la route courante est hors du groupe", () => {
			mockUsePathname.mockReturnValue("/admin/ventes/commandes");
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-default-open", "false");
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

		it("sets role=list on SidebarMenu (iOS Safari + VoiceOver)", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-menu")).toHaveAttribute("role", "list");
		});

		it("omits aria-label on SidebarMenu (parent aria-labelledby suffices)", () => {
			render(<CollapsibleNavGroup groupLabel="Catalogue" groupId="catalogue-group" />);
			expect(screen.getByTestId("sidebar-menu")).not.toHaveAttribute("aria-label");
		});
	});
});
