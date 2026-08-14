import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// MODULE MOCKS
// ============================================================================

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

vi.mock("@/shared/components/logo", () => ({
	Logo: ({ size, showText }: { size?: number; showText?: boolean }) => (
		// eslint-disable-next-line @next/next/no-img-element -- test mock, not real image
		<img
			data-testid="logo"
			data-size={size}
			data-show-text={showText ? "true" : undefined}
			alt=""
		/>
	),
	// Le rail admin dérive son tooltip ET son aria-label du gabarit unique : mocker
	// `Logo` seul faisait échouer le module entier sur un export manquant.
	brandLinkLabel: (href: string) =>
		href === "/admin" ? "Synclune - Administration" : "Synclune - Accueil",
}));

vi.mock("@/shared/components/ui/sidebar", () => ({
	Sidebar: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar">{children}</div>
	),
	SidebarHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar-header">{children}</div>
	),
	SidebarContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sidebar-content">{children}</div>
	),
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
	// ⚠️ Le reste des props est SPREADÉ, comme le fait le vrai composant
	// (`mergeProps<"button">({…}, props)` dans `ui/sidebar.tsx`). Un mock qui les
	// jetait rendait `aria-label` invisible aux tests alors qu'il atteint bien
	// l'ancre en production — l'angle mort classique du mock trop simple.
	SidebarMenuButton: ({ children, tooltip, render, size: _size, ...rest }: RenderPropMockProps) =>
		renderPropMock("div", {
			"data-testid": "sidebar-menu-button",
			title: tooltip,
			render,
			children,
			...rest,
		}),
	SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
		<li data-testid="sidebar-menu-item">{children}</li>
	),
	SidebarSeparator: ({ className }: { className?: string }) => (
		<hr data-testid="sidebar-separator" className={className} />
	),
}));

vi.mock("../collapsible-nav-group", () => ({
	CollapsibleNavGroup: ({ groupLabel, groupId }: { groupLabel: string; groupId: string }) => (
		<div
			data-testid="collapsible-nav-group"
			data-group-label={groupLabel}
			data-group-id={groupId}
		/>
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

vi.mock("../sidebar-footer-user", () => ({
	SidebarFooterUser: ({ user }: { user: { name: string; email: string } }) => (
		<div data-testid="sidebar-footer-user" data-name={user.name} data-email={user.email} />
	),
}));

import { AdminSidebar } from "../admin-sidebar";
import { navigationData } from "../navigation-config";
import { BRAND } from "@/shared/constants/brand";

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

describe("AdminSidebar — rendering", () => {
	it("delegates the wordmark to Logo instead of redrawing it", () => {
		render(<AdminSidebar />);

		const brandLink = screen.getByRole("link");
		expect(brandLink).toHaveAttribute("href", "/admin");

		// Le rail recopiait un <span class="font-cursive … tracking-wide"> à côté du
		// logo : deuxième dessin du même mot, à maintenir en parallèle. Il demande
		// désormais le wordmark à `Logo`, qui en est la SSOT.
		expect(screen.getByTestId("logo")).toHaveAttribute("data-show-text", "true");
	});

	it("names the brand link by its destination, pas seulement par la marque", () => {
		render(<AdminSidebar />);

		// Avec `showText`, l'image passe en alt="" + aria-hidden : sans libellé
		// explicite le nom accessible tomberait à « Synclune » et ne dirait plus où
		// le lien mène. Il contient le texte visible (WCAG 2.5.3).
		const brandLink = screen.getByRole("link");
		expect(brandLink).toHaveAttribute("aria-label", `${BRAND.name} - Administration`);
		expect(brandLink.getAttribute("aria-label")).toContain(BRAND.name);
	});

	it("renders every navGroup from navigationData", () => {
		render(<AdminSidebar />);

		const collapsibleLabels = navigationData.navGroups
			.filter((g) => g.collapsible)
			.map((g) => g.label);
		const nonCollapsibleLabels = navigationData.navGroups
			.filter((g) => !g.collapsible)
			.map((g) => g.label);

		const renderedGroupLabels = screen
			.getAllByTestId("sidebar-group-label")
			.map((el) => el.textContent);
		for (const label of nonCollapsibleLabels) {
			expect(renderedGroupLabels).toContain(label);
		}

		const renderedCollapsibleLabels = screen
			.getAllByTestId("collapsible-nav-group")
			.map((el) => el.getAttribute("data-group-label"));
		for (const label of collapsibleLabels) {
			expect(renderedCollapsibleLabels).toContain(label);
		}

		expect(screen.getAllByTestId("collapsible-nav-group")).toHaveLength(collapsibleLabels.length);
		expect(screen.getAllByTestId("sidebar-group")).toHaveLength(nonCollapsibleLabels.length);
	});

	it("locks role=list on SidebarMenu (iOS Safari + VoiceOver) — F1", () => {
		render(<AdminSidebar />);
		const menus = screen.getAllByTestId("sidebar-menu");
		expect(menus.length).toBeGreaterThan(0);
		for (const menu of menus) {
			expect(menu).toHaveAttribute("role", "list");
		}
	});

	it("locks aria-labelledby on SidebarGroup pointing to SidebarGroupLabel id — F2", () => {
		render(<AdminSidebar />);
		const groups = screen.getAllByTestId("sidebar-group");

		for (const group of groups) {
			expect(group).toHaveAttribute("role", "group");
			const labelledBy = group.getAttribute("aria-labelledby");
			expect(labelledBy).toBeTruthy();
			const label = document.getElementById(labelledBy!);
			expect(label).not.toBeNull();
		}
	});

	it("omits aria-label on SidebarMenu inside groups (parent aria-labelledby suffices) — F2", () => {
		render(<AdminSidebar />);
		const menus = screen.getAllByTestId("sidebar-menu");
		for (const menu of menus) {
			expect(menu).not.toHaveAttribute("aria-label");
		}
	});

	it("derives groupId as slug of group.label (stable across SHOP_LIVE reorder) — F3", () => {
		render(<AdminSidebar />);

		const nonCollapsibleGroups = navigationData.navGroups.filter((g) => !g.collapsible);
		for (const group of nonCollapsibleGroups) {
			const expectedId = `nav-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
			expect(document.getElementById(expectedId)).not.toBeNull();
		}

		const collapsibleGroups = navigationData.navGroups.filter((g) => g.collapsible);
		const collapsibleNodes = screen.getAllByTestId("collapsible-nav-group");
		const propIds = collapsibleNodes.map((node) => node.getAttribute("data-group-id"));
		for (const group of collapsibleGroups) {
			const expectedId = `nav-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
			expect(propIds).toContain(expectedId);
		}
	});

	it("renders SidebarFooterUser only when user prop provided", () => {
		const { rerender } = render(<AdminSidebar />);
		expect(screen.queryByTestId("sidebar-footer-user")).toBeNull();

		rerender(<AdminSidebar user={{ name: "Adrien", email: "adrien@example.com" }} />);
		const footer = screen.getByTestId("sidebar-footer-user");
		expect(footer).toHaveAttribute("data-name", "Adrien");
		expect(footer).toHaveAttribute("data-email", "adrien@example.com");
	});
});
