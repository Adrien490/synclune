import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} className={className} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("class-variance-authority", () => ({
	cva: () => () => "kpi-card-mock",
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card" className={className}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
	),
	CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 data-testid="card-title" className={className}>
			{children}
		</h3>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
	}) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="tooltip-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		className,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} className={className}>
			{children}
		</span>
	),
}));

vi.mock("lucide-react", () => ({
	ChevronRight: () => <svg data-testid="chevron-right" />,
	Info: () => <svg data-testid="info-icon" />,
}));

vi.mock("../kpi-evolution", () => ({
	KpiEvolution: ({
		evolution,
		comparisonLabel,
	}: {
		evolution: number;
		comparisonLabel?: string;
	}) => (
		<div data-testid="kpi-evolution" data-evolution={evolution} data-comparison={comparisonLabel}>
			{evolution}%
		</div>
	),
}));

vi.mock("../kpi-value", () => ({
	KpiValue: ({ value, suffix }: { value: string | number; suffix?: string }) => (
		<div data-testid="kpi-value">
			{value}
			{suffix}
		</div>
	),
}));

import { KpiCard } from "../kpi-card";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("KpiCard", () => {
	it("renders the title", () => {
		render(<KpiCard title="CA du mois" value="1 500 €" />);

		expect(screen.getByText("CA du mois")).toBeInTheDocument();
	});

	it("renders the value via KpiValue", () => {
		render(<KpiCard title="CA du mois" value="1 500 €" />);

		expect(screen.getByTestId("kpi-value")).toHaveTextContent("1 500 €");
	});

	it("renders evolution when provided", () => {
		render(
			<KpiCard
				title="CA du mois"
				value="1 500 €"
				evolution={12.5}
				comparisonLabel="vs mois dernier"
			/>,
		);

		const evolution = screen.getByTestId("kpi-evolution");
		expect(evolution).toBeInTheDocument();
		expect(evolution).toHaveAttribute("data-evolution", "12.5");
		expect(evolution).toHaveAttribute("data-comparison", "vs mois dernier");
	});

	it("does not render evolution when undefined", () => {
		render(<KpiCard title="CA du mois" value="1 500 €" />);

		expect(screen.queryByTestId("kpi-evolution")).toBeNull();
	});

	it("renders icon when provided", () => {
		render(
			<KpiCard
				title="CA du mois"
				value="1 500 €"
				icon={<span data-testid="custom-icon">$</span>}
			/>,
		);

		expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
	});

	it("renders badge when provided", () => {
		render(
			<KpiCard
				title="CA du mois"
				value="1 500 €"
				badge={{ label: "Nouveau", variant: "default" }}
			/>,
		);

		expect(screen.getByText("Nouveau")).toBeInTheDocument();
	});

	it("renders subtitle when provided", () => {
		render(<KpiCard title="CA du mois" value="1 500 €" subtitle="Hors taxes" />);

		expect(screen.getByText("Hors taxes")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Link behavior
	// -------------------------------------------------------------------------

	describe("with href", () => {
		it("wraps card in a link", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" href="/admin/ventes" />);

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/admin/ventes");
		});

		it("renders chevron icon", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" href="/admin/ventes" />);

			expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
		});

		it("sets accessible label with navigation hint", () => {
			render(
				<KpiCard
					title="CA du mois"
					value="1 500 €"
					numericValue={1500}
					suffix=" €"
					evolution={10}
					comparisonLabel="vs mois dernier"
					href="/admin/ventes"
				/>,
			);

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("aria-label");
			const label = link.getAttribute("aria-label")!;
			expect(label).toContain("CA du mois");
			expect(label).toContain("1500 €");
			expect(label).toContain("Cliquer pour voir les details");
		});
	});

	describe("without href", () => {
		it("renders card without link wrapper", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" />);

			expect(screen.queryByRole("link")).toBeNull();
		});

		it("does not render chevron icon", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" />);

			expect(screen.queryByTestId("chevron-right")).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Tooltip
	// -------------------------------------------------------------------------

	describe("tooltip", () => {
		it("renders tooltip content when provided", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" tooltip="Chiffre d'affaires total" />);

			expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Chiffre d'affaires total");
		});

		it("renders info icon when tooltip is provided", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" tooltip="Info text" />);

			expect(screen.getByTestId("info-icon")).toBeInTheDocument();
		});

		it("does not render tooltip when not provided", () => {
			render(<KpiCard title="CA du mois" value="1 500 €" />);

			expect(screen.queryByTestId("tooltip-content")).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Accessibility
	// -------------------------------------------------------------------------

	describe("accessibility", () => {
		it("includes evolution direction in accessible label", () => {
			render(
				<KpiCard
					title="Commandes"
					value="25"
					numericValue={25}
					evolution={-15.3}
					href="/admin/ventes"
				/>,
			);

			const label = screen.getByRole("link").getAttribute("aria-label")!;
			expect(label).toContain("En baisse");
			expect(label).toContain("15.3%");
		});

		it("uses 'En hausse' for positive evolution", () => {
			render(
				<KpiCard
					title="Commandes"
					value="25"
					numericValue={25}
					evolution={8}
					href="/admin/ventes"
				/>,
			);

			const label = screen.getByRole("link").getAttribute("aria-label")!;
			expect(label).toContain("En hausse");
		});

		it("uses string value in label when numericValue is not set", () => {
			render(<KpiCard title="Test" value="N/A" href="/test" />);

			const label = screen.getByRole("link").getAttribute("aria-label")!;
			expect(label).toContain("N/A");
		});
	});
});
