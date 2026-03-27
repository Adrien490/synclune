import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/refunds/constants/refund.constants", () => ({
	REFUND_STATUS_LABELS: {
		PENDING: "En attente",
		APPROVED: "Approuvé",
		COMPLETED: "Remboursé",
		REJECTED: "Refusé",
		CANCELLED: "Annulé",
	},
	REFUND_STATUS_VARIANTS: {
		PENDING: "warning",
		APPROVED: "success",
		COMPLETED: "secondary",
		REJECTED: "destructive",
		CANCELLED: "outline",
	},
	REFUND_REASON_LABELS: {
		CUSTOMER_REQUEST: "Demande client",
		DEFECTIVE: "Défectueux",
		WRONG_ITEM: "Mauvais article",
		NOT_AS_DESCRIBED: "Non conforme à la description",
		OTHER: "Autre",
	},
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("@/shared/utils/dates", () => ({
	formatDateShort: vi.fn((date: Date) => date.toISOString().split("T")[0]),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("lucide-react", () => ({
	RotateCcw: () => <svg data-testid="icon-rotate-ccw" />,
}));

import { OrderRefundsCard } from "../order-refunds-card";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

type RefundItem = {
	id: string;
	quantity: number;
	amount: number;
	orderItemId: string;
	orderItem: {
		productTitle: string;
		skuColor: string | null;
	};
};

type Refund = {
	id: string;
	status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "FAILED";
	amount: number;
	reason: "CUSTOMER_REQUEST" | "DEFECTIVE" | "WRONG_ITEM" | "LOST_IN_TRANSIT" | "FRAUD" | "OTHER";
	createdAt: Date;
	processedAt: Date | null;
	note: string | null;
	currency: string;
	items: RefundItem[];
};

function createRefund(overrides: Partial<Refund> = {}): Refund {
	return {
		id: "refund-1",
		status: "PENDING",
		amount: 2500,
		reason: "CUSTOMER_REQUEST",
		createdAt: new Date("2024-03-01T10:00:00Z"),
		processedAt: null,
		note: null,
		currency: "EUR",
		items: [],
		...overrides,
	};
}

function createRefundItem(overrides: Partial<RefundItem> = {}): RefundItem {
	return {
		id: "item-1",
		quantity: 1,
		amount: 2500,
		orderItemId: "oi-1",
		orderItem: {
			productTitle: "Bague en argent",
			skuColor: null,
		},
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("OrderRefundsCard", () => {
	describe("heading", () => {
		it("renders 'Remboursements' heading", () => {
			render(<OrderRefundsCard refunds={[createRefund()]} />);
			expect(screen.getByRole("heading", { name: /Remboursements/i })).toBeInTheDocument();
		});

		it("shows refund count badge with 1 refund", () => {
			render(<OrderRefundsCard refunds={[createRefund()]} />);
			const badges = screen.getAllByTestId("badge");
			// First badge is the count badge in the heading
			expect(badges[0]).toHaveTextContent("1");
		});

		it("shows refund count badge with multiple refunds", () => {
			render(
				<OrderRefundsCard
					refunds={[
						createRefund({ id: "refund-1" }),
						createRefund({ id: "refund-2" }),
						createRefund({ id: "refund-3" }),
					]}
				/>,
			);
			const badges = screen.getAllByTestId("badge");
			expect(badges[0]).toHaveTextContent("3");
		});
	});

	describe("total refunded", () => {
		it("does not show total when there is only 1 refund", () => {
			render(<OrderRefundsCard refunds={[createRefund({ amount: 2500 })]} />);
			expect(screen.queryByText(/Total remboursé/i)).not.toBeInTheDocument();
		});

		it("shows total refunded when there are more than 1 refund", () => {
			render(
				<OrderRefundsCard
					refunds={[
						createRefund({ id: "refund-1", amount: 2500 }),
						createRefund({ id: "refund-2", amount: 1500 }),
					]}
				/>,
			);
			expect(screen.getByText(/Total remboursé/i)).toBeInTheDocument();
		});

		it("calculates correct total from multiple refunds", () => {
			render(
				<OrderRefundsCard
					refunds={[
						createRefund({ id: "refund-1", amount: 2500 }),
						createRefund({ id: "refund-2", amount: 1500 }),
					]}
				/>,
			);
			// Total = 4000 cents = 40.00 €
			expect(screen.getByText(/Total remboursé/i).closest("p")).toHaveTextContent("40.00 €");
		});
	});

	describe("refund status badge", () => {
		it("shows status label for PENDING refund", () => {
			render(<OrderRefundsCard refunds={[createRefund({ status: "PENDING" })]} />);
			expect(screen.getByText("En attente")).toBeInTheDocument();
		});

		it("shows status label for APPROVED refund", () => {
			render(<OrderRefundsCard refunds={[createRefund({ status: "APPROVED" })]} />);
			expect(screen.getByText("Approuvé")).toBeInTheDocument();
		});

		it("shows status label for COMPLETED refund", () => {
			render(<OrderRefundsCard refunds={[createRefund({ status: "COMPLETED" })]} />);
			expect(screen.getByText("Remboursé")).toBeInTheDocument();
		});

		it("shows status label for REJECTED refund", () => {
			render(<OrderRefundsCard refunds={[createRefund({ status: "REJECTED" })]} />);
			expect(screen.getByText("Refusé")).toBeInTheDocument();
		});
	});

	describe("refund amount", () => {
		it("displays the formatted amount", () => {
			render(<OrderRefundsCard refunds={[createRefund({ amount: 3000 })]} />);
			expect(screen.getByText("30.00 €")).toBeInTheDocument();
		});
	});

	describe("refund reason", () => {
		it("displays the reason label", () => {
			render(<OrderRefundsCard refunds={[createRefund({ reason: "CUSTOMER_REQUEST" })]} />);
			expect(screen.getByText("Demande client")).toBeInTheDocument();
		});

		it("displays DEFECTIVE reason label", () => {
			render(<OrderRefundsCard refunds={[createRefund({ reason: "DEFECTIVE" })]} />);
			expect(screen.getByText("Défectueux")).toBeInTheDocument();
		});
	});

	describe("dates", () => {
		it("shows 'Demandé le' with the creation date", () => {
			render(
				<OrderRefundsCard
					refunds={[createRefund({ createdAt: new Date("2024-03-01T10:00:00Z") })]}
				/>,
			);
			expect(screen.getByText(/Demandé le/i)).toBeInTheDocument();
			expect(screen.getByText(/2024-03-01/)).toBeInTheDocument();
		});

		it("does not show 'Traité le' when processedAt is null", () => {
			render(<OrderRefundsCard refunds={[createRefund({ processedAt: null })]} />);
			expect(screen.queryByText(/Traité le/i)).not.toBeInTheDocument();
		});

		it("shows 'Traité le' when processedAt is set", () => {
			render(
				<OrderRefundsCard
					refunds={[createRefund({ processedAt: new Date("2024-03-05T12:00:00Z") })]}
				/>,
			);
			expect(screen.getByText(/Traité le/)).toBeInTheDocument();
			expect(screen.getByText(/2024-03-05/)).toBeInTheDocument();
		});
	});

	describe("refund items", () => {
		it("does not render items list when refund has no items", () => {
			render(<OrderRefundsCard refunds={[createRefund({ items: [] })]} />);
			expect(screen.queryByRole("list")).not.toBeInTheDocument();
		});

		it("renders refund items as a list", () => {
			const items = [
				createRefundItem({
					id: "ri-1",
					quantity: 2,
					orderItem: { productTitle: "Bague en argent", skuColor: null },
				}),
			];
			render(<OrderRefundsCard refunds={[createRefund({ items })]} />);
			expect(screen.getByRole("list")).toBeInTheDocument();
			expect(screen.getByText(/Bague en argent/)).toBeInTheDocument();
			expect(screen.getByText(/×2/)).toBeInTheDocument();
		});

		it("shows sku color in parentheses when present", () => {
			const items = [
				createRefundItem({
					id: "ri-1",
					orderItem: { productTitle: "Collier doré", skuColor: "Or" },
				}),
			];
			render(<OrderRefundsCard refunds={[createRefund({ items })]} />);
			expect(screen.getByText(/Or/)).toBeInTheDocument();
		});

		it("does not show parentheses when skuColor is null", () => {
			const items = [
				createRefundItem({
					id: "ri-1",
					orderItem: { productTitle: "Bague simple", skuColor: null },
				}),
			];
			render(<OrderRefundsCard refunds={[createRefund({ items })]} />);
			// Should not have any parenthetical text in the list item
			const listItems = screen.getAllByRole("listitem");
			listItems.forEach((li) => {
				expect(li.textContent).not.toMatch(/\(/);
			});
		});
	});

	describe("multiple refunds", () => {
		it("renders each refund as its own card", () => {
			render(
				<OrderRefundsCard
					refunds={[
						createRefund({ id: "refund-1", status: "APPROVED", amount: 2500 }),
						createRefund({ id: "refund-2", status: "PENDING", amount: 1500 }),
					]}
				/>,
			);
			expect(screen.getByText("Approuvé")).toBeInTheDocument();
			expect(screen.getByText("En attente")).toBeInTheDocument();
			expect(screen.getByText("25.00 €")).toBeInTheDocument();
			expect(screen.getByText("15.00 €")).toBeInTheDocument();
		});
	});
});
