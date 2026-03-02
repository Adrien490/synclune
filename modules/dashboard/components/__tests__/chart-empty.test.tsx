import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({
		children,
		className,
		style,
	}: {
		children: React.ReactNode;
		className?: string;
		style?: React.CSSProperties;
	}) => (
		<div data-testid="empty" className={className} style={style}>
			{children}
		</div>
	),
	EmptyDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="empty-description">{children}</p>
	),
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="empty-media">{children}</div>
	),
	EmptyTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<h3 data-testid="empty-title" className={className}>
			{children}
		</h3>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		asChild: _asChild,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		asChild?: boolean;
		variant?: string;
		size?: string;
	}) => <button onClick={onClick}>{children}</button>,
}));

vi.mock("../../constants/empty-states", () => ({
	EMPTY_STATES: {
		noRevenue: {
			icon: ({ className }: { className?: string }) => (
				<svg data-testid="empty-icon" className={className} />
			),
			title: "Aucun revenu",
			description: "Aucune vente enregistrée sur cette période.",
		},
	},
}));

import { ChartEmpty } from "../chart-empty";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ChartEmpty", () => {
	it("renders the title from config", () => {
		render(<ChartEmpty type="noRevenue" />);

		expect(screen.getByTestId("empty-title")).toHaveTextContent("Aucun revenu");
	});

	it("renders the description from config", () => {
		render(<ChartEmpty type="noRevenue" />);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune vente enregistrée sur cette période.",
		);
	});

	it("renders the icon from config", () => {
		render(<ChartEmpty type="noRevenue" />);

		expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Period label
	// -------------------------------------------------------------------------

	it("inserts period label into description", () => {
		render(<ChartEmpty type="noRevenue" periodLabel="ce trimestre" />);

		expect(screen.getByTestId("empty-description")).toHaveTextContent(
			"Aucune vente enregistrée sur cette période ce trimestre.",
		);
	});

	// -------------------------------------------------------------------------
	// Min height
	// -------------------------------------------------------------------------

	it("applies default min height of 250px", () => {
		render(<ChartEmpty type="noRevenue" />);

		const empty = screen.getByTestId("empty");
		expect(empty.style.minHeight).toBe("250px");
	});

	it("applies custom min height", () => {
		render(<ChartEmpty type="noRevenue" minHeight={300} />);

		const empty = screen.getByTestId("empty");
		expect(empty.style.minHeight).toBe("300px");
	});

	// -------------------------------------------------------------------------
	// Action
	// -------------------------------------------------------------------------

	describe("action", () => {
		it("renders action button with href as link", () => {
			render(
				<ChartEmpty
					type="noRevenue"
					action={{ label: "Voir les produits", href: "/admin/catalogue" }}
				/>,
			);

			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("href", "/admin/catalogue");
			expect(link).toHaveTextContent("Voir les produits");
		});

		it("renders action button with onClick handler", () => {
			const onClick = vi.fn();

			render(<ChartEmpty type="noRevenue" action={{ label: "Actualiser", onClick }} />);

			expect(screen.getByText("Actualiser")).toBeInTheDocument();
		});

		it("does not render action section when action is not provided", () => {
			render(<ChartEmpty type="noRevenue" />);

			expect(screen.queryByRole("button")).toBeNull();
			expect(screen.queryByRole("link")).toBeNull();
		});
	});
});
