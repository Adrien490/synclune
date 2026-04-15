import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/page-header", () => ({
	PageHeader: ({
		title,
		description,
		className,
	}: {
		title: string;
		description?: string;
		variant?: string;
		className?: string;
	}) => (
		<div data-testid="page-header" className={className}>
			<h1>{title}</h1>
			{description && <p>{description}</p>}
		</div>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="card-description">{children}</p>
	),
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 data-testid="card-title" className={className}>
			{children}
		</h3>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string")
			.join(" "),
}));

import { SectionNavigation } from "../section-navigation";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

const MockIcon: LucideIcon = ((props: Record<string, unknown>) => (
	<svg data-testid="icon" {...props} />
)) as unknown as LucideIcon;

const baseLinks = [
	{ title: "Produits", description: "Gérer les produits", href: "/admin/produits", icon: MockIcon },
	{
		title: "Collections",
		description: "Gérer les collections",
		href: "/admin/collections",
		icon: MockIcon,
	},
	{ title: "Couleurs", href: "/admin/couleurs" },
];

// ============================================================================
// TESTS
// ============================================================================

describe("SectionNavigation", () => {
	describe("rendering", () => {
		it("renders page header with title", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			expect(screen.getByText("Catalogue")).toBeInTheDocument();
		});

		it("renders page header with description", () => {
			render(
				<SectionNavigation title="Catalogue" description="Gérer le catalogue" links={baseLinks} />,
			);
			expect(screen.getByText("Gérer le catalogue")).toBeInTheDocument();
		});

		it("renders all links as cards", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			const cards = screen.getAllByTestId("card");
			expect(cards).toHaveLength(3);
		});

		it("renders link titles", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			expect(screen.getByText("Produits")).toBeInTheDocument();
			expect(screen.getByText("Collections")).toBeInTheDocument();
			expect(screen.getByText("Couleurs")).toBeInTheDocument();
		});

		it("renders descriptions when provided", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			expect(screen.getByText("Gérer les produits")).toBeInTheDocument();
			expect(screen.getByText("Gérer les collections")).toBeInTheDocument();
		});

		it("renders correct hrefs", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			const links = screen.getAllByRole("link");
			expect(links[0]).toHaveAttribute("href", "/admin/produits");
			expect(links[1]).toHaveAttribute("href", "/admin/collections");
		});
	});

	describe("icons", () => {
		it("renders icons when provided", () => {
			render(<SectionNavigation title="Catalogue" links={baseLinks} />);
			const icons = screen.getAllByTestId("icon");
			expect(icons).toHaveLength(2); // Only 2 links have icons
		});

		it("does not render icon when not provided", () => {
			render(<SectionNavigation title="Test" links={[{ title: "No Icon", href: "/test" }]} />);
			expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
		});
	});

	describe("badges", () => {
		it("renders badge when provided", () => {
			const linksWithBadge = [{ title: "Commandes", href: "/orders", badge: "12 nouvelles" }];
			render(<SectionNavigation title="Ventes" links={linksWithBadge} />);
			expect(screen.getByText("12 nouvelles")).toBeInTheDocument();
		});

		it("does not render badge when not provided", () => {
			render(<SectionNavigation title="Test" links={baseLinks} />);
			// No badge text should be rendered
			expect(screen.queryByText("nouvelles")).not.toBeInTheDocument();
		});
	});

	describe("grid columns", () => {
		it("defaults to 2 columns", () => {
			const { container } = render(<SectionNavigation title="Test" links={baseLinks} />);
			const grid = container.querySelector(".grid");
			expect(grid?.className).toContain("md:grid-cols-2");
		});

		it("renders 1 column when specified", () => {
			const { container } = render(
				<SectionNavigation title="Test" links={baseLinks} columns={1} />,
			);
			const grid = container.querySelector(".grid");
			expect(grid?.className).toContain("grid-cols-1");
			expect(grid?.className).not.toContain("md:grid-cols-2");
		});

		it("renders 3 columns when specified", () => {
			const { container } = render(
				<SectionNavigation title="Test" links={baseLinks} columns={3} />,
			);
			const grid = container.querySelector(".grid");
			expect(grid?.className).toContain("lg:grid-cols-3");
		});
	});
});
