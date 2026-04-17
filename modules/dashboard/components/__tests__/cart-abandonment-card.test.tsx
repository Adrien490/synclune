import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GetCartAbandonmentReturn } from "../../types/dashboard.types";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (amount: number) => `${amount.toFixed(2)} €`,
}));

vi.mock("lucide-react", () => ({
	ShoppingCart: () => <span data-testid="icon-shopping-cart" />,
	Mail: () => <span data-testid="icon-mail" />,
	TrendingUp: () => <span data-testid="icon-trending-up" />,
	ArrowRight: () => <span data-testid="icon-arrow-right" />,
	ArrowUp: () => <span data-testid="icon-arrow-up" />,
	ArrowDown: () => <span data-testid="icon-arrow-down" />,
	ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

// Mobile-only primitives stubbed out so only the desktop Card renders.
vi.mock("@/shared/components/ui/item", () => ({
	Item: () => null,
	ItemGroup: () => null,
	ItemContent: () => null,
	ItemTitle: () => null,
	ItemMedia: () => null,
	ItemActions: () => null,
	ItemSeparator: () => null,
	ItemDescription: () => null,
	ItemFooter: () => null,
}));

vi.mock("../stat-row", () => ({
	StatRow: () => null,
}));

// Force desktop rendering path in jsdom (no matchMedia)
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

vi.mock("next/link", () => ({
	default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

import { CartAbandonmentCard } from "../cart-abandonment-card";

afterEach(() => {
	cleanup();
});

// ============================================================================
// HELPERS
// ============================================================================

function makeData(overrides: Partial<GetCartAbandonmentReturn> = {}): GetCartAbandonmentReturn {
	return {
		activeCarts: { count: 12, totalValue: 5400 },
		abandonedEmailsSent: { count: 8, evolution: 33 },
		recoveryRate: { rate: 25, recoveredCount: 2, evolution: 50 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartAbandonmentCard", () => {
	it("renders the title and description", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		// Title appears in both mobile (<h3>) and desktop (<CardTitle>)
		expect(screen.getAllByText("Paniers & récupération").length).toBeGreaterThanOrEqual(1);
		expect(
			screen.getByText("Suivi des paniers abandonnés et taux de conversion des relances"),
		).toBeInTheDocument();
	});

	it("renders the link to orders list", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		// Link appears in both mobile header + desktop Card header
		const links = screen.getAllByLabelText("Voir les commandes");
		expect(links.length).toBeGreaterThanOrEqual(1);
		expect(links[0]).toHaveAttribute("href", "/admin/ventes/commandes");
	});

	// -------------------------------------------------------------------------
	// Active carts
	// -------------------------------------------------------------------------

	it("renders active carts count and potential value", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		expect(screen.getByText("Paniers actifs")).toBeInTheDocument();
		expect(screen.getByText("12")).toBeInTheDocument();
		expect(screen.getByText("5400.00 € potentiel")).toBeInTheDocument();
	});

	it("renders empty active carts state when count is 0", () => {
		render(<CartAbandonmentCard data={makeData({ activeCarts: { count: 0, totalValue: 0 } })} />);

		expect(screen.getByText("Aucun panier en attente")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Emails sent
	// -------------------------------------------------------------------------

	it("renders abandoned emails sent count with evolution", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		expect(screen.getByText("Relances envoyées")).toBeInTheDocument();
		expect(screen.getByText("8")).toBeInTheDocument();
		expect(screen.getByText("33.0%")).toBeInTheDocument();
	});

	it("renders empty emails state when count is 0", () => {
		render(
			<CartAbandonmentCard
				data={makeData({
					abandonedEmailsSent: { count: 0, evolution: 0 },
					recoveryRate: { rate: 0, recoveredCount: 0, evolution: 0 },
				})}
			/>,
		);

		expect(screen.getByText("Aucun email envoyé")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Recovery rate
	// -------------------------------------------------------------------------

	it("renders recovery rate as percentage with recovered count subtitle", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		expect(screen.getByText("Taux de récupération")).toBeInTheDocument();
		expect(screen.getByText("25.0 %")).toBeInTheDocument();
		expect(screen.getByText("2 récupérés")).toBeInTheDocument();
	});

	it("renders singular 'récupéré' when recovered count is 1", () => {
		render(
			<CartAbandonmentCard
				data={makeData({
					recoveryRate: { rate: 12.5, recoveredCount: 1, evolution: 0 },
				})}
			/>,
		);

		expect(screen.getByText("1 récupéré")).toBeInTheDocument();
	});

	it("renders dash and 'Données insuffisantes' when no emails sent", () => {
		render(
			<CartAbandonmentCard
				data={makeData({
					abandonedEmailsSent: { count: 0, evolution: 0 },
					recoveryRate: { rate: 0, recoveredCount: 0, evolution: 0 },
				})}
			/>,
		);

		expect(screen.getByText("—")).toBeInTheDocument();
		expect(screen.getByText("Données insuffisantes")).toBeInTheDocument();
	});

	it("uses provided comparisonLabel for evolution", () => {
		render(<CartAbandonmentCard data={makeData()} comparisonLabel="vs trimestre dernier" />);

		expect(screen.getByText("vs trimestre dernier")).toBeInTheDocument();
	});

	// -------------------------------------------------------------------------
	// Edge cases
	// -------------------------------------------------------------------------

	it("renders 0 cart count consistently when activeCarts.count is 0", () => {
		render(<CartAbandonmentCard data={makeData({ activeCarts: { count: 0, totalValue: 0 } })} />);

		expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(1);
	});

	it("renders all 3 metric blocks", () => {
		render(<CartAbandonmentCard data={makeData()} />);

		expect(screen.getByText("Paniers actifs")).toBeInTheDocument();
		expect(screen.getByText("Relances envoyées")).toBeInTheDocument();
		expect(screen.getByText("Taux de récupération")).toBeInTheDocument();
	});
});
