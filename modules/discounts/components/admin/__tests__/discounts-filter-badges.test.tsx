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

vi.mock("@/app/generated/prisma/browser", () => ({
	DiscountType: {
		PERCENTAGE: "PERCENTAGE",
		FIXED_AMOUNT: "FIXED_AMOUNT",
	},
}));

vi.mock("@/modules/discounts/constants/discount.constants", () => ({
	DISCOUNT_TYPE_LABELS: {
		PERCENTAGE: "Pourcentage",
		FIXED_AMOUNT: "Montant fixe",
	},
}));

vi.mock("@/shared/utils/format-status-filter", () => ({
	formatStatusFilter: (value: string) => ({
		label: "Statut",
		displayValue: value === "true" ? "Actif" : "Inactif",
	}),
}));

vi.mock("@/shared/hooks/use-filter", () => ({}));

import { DiscountsFilterBadges } from "../discounts-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("DiscountsFilterBadges", () => {
	it("renders the FilterBadges component", () => {
		render(<DiscountsFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function prop to FilterBadges", () => {
		render(<DiscountsFilterBadges />);
		expect(typeof capturedProps.current?.formatFilter).toBe("function");
	});

	describe("formatFilter logic", () => {
		function getFormatFilter() {
			render(<DiscountsFilterBadges />);
			return capturedProps.current?.formatFilter as (filter: {
				key: string;
				value: unknown;
			}) => Record<string, string> | null;
		}

		it("formats type filter with 'Pourcentage' display value", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_type", value: "PERCENTAGE" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Type");
			expect(result?.displayValue).toBe("Pourcentage");
		});

		it("formats type filter with 'Montant fixe' display value", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_type", value: "FIXED_AMOUNT" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Type");
			expect(result?.displayValue).toBe("Montant fixe");
		});

		it("formats isActive filter via formatStatusFilter", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_isActive", value: "true" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Statut");
		});

		it("formats hasUsages filter with 'Avec utilisations' when value is true", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_hasUsages", value: "true" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Utilisations");
			expect(result?.displayValue).toBe("Avec utilisations");
		});

		it("formats hasUsages filter with 'Sans utilisation' when value is false", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_hasUsages", value: "false" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Utilisations");
			expect(result?.displayValue).toBe("Sans utilisation");
		});

		it("returns key and value as-is for unknown filters", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_unknown", value: "someValue" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("unknown");
			expect(result?.displayValue).toBe("someValue");
		});
	});
});
