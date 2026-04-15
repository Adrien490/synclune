import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as LucideReact from "lucide-react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUsePathname } = vi.hoisted(() => ({
	mockUsePathname: vi.fn(() => "/admin"),
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

vi.mock("lucide-react", async (importOriginal) => {
	const actual = await importOriginal<typeof LucideReact>();
	return {
		...actual,
		Ellipsis: (props: Record<string, unknown>) => <svg data-testid="ellipsis-icon" {...props} />,
	};
});

vi.mock("@/shared/components/ui/breadcrumb", () => ({
	Breadcrumb: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<nav data-testid="breadcrumb" className={className} aria-label={ariaLabel}>
			{children}
		</nav>
	),
	BreadcrumbItem: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="breadcrumb-item" className={className}>
			{children}
		</span>
	),
	BreadcrumbLink: ({
		children,
		href,
		className,
		title,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
		title?: string;
	}) => (
		<a data-testid="breadcrumb-link" href={href} className={className} title={title}>
			{children}
		</a>
	),
	BreadcrumbList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<ol data-testid="breadcrumb-list" className={className}>
			{children}
		</ol>
	),
	BreadcrumbPage: ({
		children,
		className,
		title,
	}: {
		children: React.ReactNode;
		className?: string;
		title?: string;
	}) => (
		<span data-testid="breadcrumb-page" className={className} title={title}>
			{children}
		</span>
	),
	BreadcrumbSeparator: ({ className }: { className?: string }) => (
		<span data-testid="breadcrumb-separator" className={className}>
			/
		</span>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-menu">{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <div data-testid="dropdown-item">{children}</div>,
	DropdownMenuTrigger: ({
		children,
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		className?: string;
	}) => (
		<button data-testid="dropdown-trigger" aria-label={ariaLabel} className={className}>
			{children}
		</button>
	),
}));

import { DashboardBreadcrumb, generateBreadcrumbs } from "../dashboard-breadcrumb";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(cleanup);

// ============================================================================
// TESTS - generateBreadcrumbs
// ============================================================================

describe("generateBreadcrumbs", () => {
	it("returns only dashboard for /admin", () => {
		const result = generateBreadcrumbs("/admin");
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			label: "Tableau de bord",
			href: "/admin",
			isCurrentPage: true,
		});
	});

	it("returns dashboard + page for a known route", () => {
		const result = generateBreadcrumbs("/admin/ventes/commandes");
		expect(result).toHaveLength(3);
		expect(result[0]!.label).toBe("Tableau de bord");
		expect(result[0]!.isCurrentPage).toBe(false);
		expect(result[2]!.label).toBe("Commandes");
		expect(result[2]!.isCurrentPage).toBe(true);
	});

	it("formats unknown segments as title case", () => {
		const result = generateBreadcrumbs("/admin/unknown-segment");
		expect(result[1]!.label).toBe("Unknown Segment");
	});

	it('formats "nouveau" as "Nouveau"', () => {
		const result = generateBreadcrumbs("/admin/catalogue/produits/nouveau");
		expect(result[result.length - 1]!.label).toBe("Nouveau");
	});

	it('formats "modifier" as "Modifier"', () => {
		const result = generateBreadcrumbs("/admin/catalogue/produits/modifier");
		expect(result[result.length - 1]!.label).toBe("Modifier");
	});

	it('formats "variantes" as "Variantes"', () => {
		const result = generateBreadcrumbs("/admin/catalogue/produits/variantes");
		expect(result[result.length - 1]!.label).toBe("Variantes");
	});

	it("matches navigation config labels for known URLs", () => {
		const result = generateBreadcrumbs("/admin/catalogue/collections");
		expect(result[2]!.label).toBe("Collections");
	});

	it("builds correct href for each segment", () => {
		const result = generateBreadcrumbs("/admin/ventes/commandes");
		expect(result[0]!.href).toBe("/admin");
		expect(result[1]!.href).toBe("/admin/ventes");
		expect(result[2]!.href).toBe("/admin/ventes/commandes");
	});

	it("marks only the last segment as current page", () => {
		const result = generateBreadcrumbs("/admin/catalogue/produits");
		const currentPages = result.filter((s) => s.isCurrentPage);
		expect(currentPages).toHaveLength(1);
		expect(currentPages[0]!.label).toBe("Produits");
	});
});

// ============================================================================
// TESTS - DashboardBreadcrumb component
// ============================================================================

describe("DashboardBreadcrumb", () => {
	describe("rendering", () => {
		it('renders with aria-label "Fil d\'Ariane"', () => {
			mockUsePathname.mockReturnValue("/admin");
			render(<DashboardBreadcrumb />);
			expect(screen.getByTestId("breadcrumb")).toHaveAttribute("aria-label", "Fil d'Ariane");
		});

		it("renders dashboard as current page on /admin", () => {
			mockUsePathname.mockReturnValue("/admin");
			render(<DashboardBreadcrumb />);
			expect(screen.getByTestId("breadcrumb-page")).toHaveTextContent("Tableau de bord");
		});

		it("renders dashboard as link when not on /admin", () => {
			mockUsePathname.mockReturnValue("/admin/ventes/commandes");
			render(<DashboardBreadcrumb />);
			const links = screen.getAllByTestId("breadcrumb-link");
			expect(links[0]).toHaveAttribute("href", "/admin");
		});

		it("renders separators between segments", () => {
			mockUsePathname.mockReturnValue("/admin/ventes/commandes");
			render(<DashboardBreadcrumb />);
			const separators = screen.getAllByTestId("breadcrumb-separator");
			expect(separators.length).toBeGreaterThan(0);
		});
	});

	describe("collapse behavior", () => {
		it("does not collapse when 4 or fewer segments", () => {
			// /admin/catalogue/produits = 3 segments (dashboard + catalogue + produits)
			mockUsePathname.mockReturnValue("/admin/catalogue/produits");
			render(<DashboardBreadcrumb />);
			expect(screen.queryByTestId("dropdown-menu")).not.toBeInTheDocument();
		});

		it("collapses when more than 4 segments", () => {
			// /admin/catalogue/produits/abc/modifier = 5 segments
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/abc/modifier");
			render(<DashboardBreadcrumb />);
			expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
		});

		it("shows collapsed segments in dropdown", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/abc/modifier");
			render(<DashboardBreadcrumb />);
			const dropdownItems = screen.getAllByTestId("dropdown-item");
			expect(dropdownItems.length).toBeGreaterThan(0);
		});

		it("keeps first and last 2 segments visible when collapsed", () => {
			mockUsePathname.mockReturnValue("/admin/catalogue/produits/abc/modifier");
			render(<DashboardBreadcrumb />);
			// First segment (dashboard) + last 2 should be visible
			expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
			expect(screen.getByText("Modifier")).toBeInTheDocument();
		});
	});
});
