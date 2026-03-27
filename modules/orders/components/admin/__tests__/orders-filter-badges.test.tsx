import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { capturedProps } = vi.hoisted(() => ({
	capturedProps: { current: null as Record<string, unknown> | null },
}));

vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: (props: Record<string, unknown>) => {
		capturedProps.current = props;
		return <div data-testid="filter-badges" />;
	},
}));

vi.mock("@/modules/orders/constants/status-display", () => ({
	ORDER_STATUS_LABELS: {
		PENDING: "En attente",
		PROCESSING: "En préparation",
		SHIPPED: "Expédiée",
		DELIVERED: "Livrée",
		CANCELLED: "Annulée",
	},
	PAYMENT_STATUS_LABELS: {
		PENDING: "En attente",
		PAID: "Payée",
		REFUNDED: "Remboursée",
		FAILED: "Échouée",
	},
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/shared/hooks/use-filter", () => ({}));

import { OrdersFilterBadges } from "../orders-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrdersFilterBadges", () => {
	it("renders the FilterBadges component", () => {
		render(<OrdersFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function prop to FilterBadges", () => {
		render(<OrdersFilterBadges />);
		expect(typeof capturedProps.current?.formatFilter).toBe("function");
	});

	describe("formatFilter logic", () => {
		function getFormatFilter() {
			render(<OrdersFilterBadges />);
			return capturedProps.current?.formatFilter as (
				filter: { key: string; value: unknown },
				options?: unknown,
			) => unknown;
		}

		it("formats order status filter with correct label and displayValue", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_status", value: "PENDING" }) as Record<
				string,
				string
			>;
			expect(result).not.toBeNull();
			expect(result.label).toBe("Statut");
			expect(result.displayValue).toBe("En attente");
		});

		it("formats payment status filter with correct label and displayValue", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_paymentStatus", value: "PAID" }) as Record<
				string,
				string
			>;
			expect(result).not.toBeNull();
			expect(result.label).toBe("Paiement");
			expect(result.displayValue).toBe("Payée");
		});

		it("returns null for totalMax filter (handled by totalMin)", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_totalMax", value: "5000" });
			expect(result).toBeNull();
		});

		it("returns null for createdBefore filter (handled by createdAfter)", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_createdBefore", value: "2026-01-01" });
			expect(result).toBeNull();
		});

		it("returns null for showDeleted filter with 'active' value", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_showDeleted", value: "active" });
			expect(result).toBeNull();
		});

		it("formats showDeleted filter with 'deleted' value", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_showDeleted", value: "deleted" }) as Record<
				string,
				string
			>;
			expect(result).not.toBeNull();
			expect(result.label).toBe("Affichage");
			expect(result.displayValue).toBe("Supprimées uniquement");
		});
	});
});
