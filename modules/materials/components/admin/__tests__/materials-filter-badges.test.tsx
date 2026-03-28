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

vi.mock("@/shared/utils/format-status-filter", () => ({
	formatStatusFilter: (value: string) => ({
		label: "Statut",
		displayValue: value === "true" ? "Actif" : "Inactif",
	}),
}));

vi.mock("@/shared/hooks/use-filter", () => ({}));

import { MaterialsFilterBadges } from "../materials-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MaterialsFilterBadges", () => {
	it("renders the FilterBadges component", () => {
		render(<MaterialsFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function prop to FilterBadges", () => {
		render(<MaterialsFilterBadges />);
		expect(typeof capturedProps.current?.formatFilter).toBe("function");
	});

	describe("formatFilter logic", () => {
		function getFormatFilter() {
			render(<MaterialsFilterBadges />);
			return capturedProps.current?.formatFilter as (filter: {
				key: string;
				value: unknown;
			}) => Record<string, string> | null;
		}

		it("formats isActive filter as 'Actif' via formatStatusFilter when value is 'true'", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_isActive", value: "true" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Statut");
			expect(result?.displayValue).toBe("Actif");
		});

		it("formats isActive filter as 'Inactif' via formatStatusFilter when value is 'false'", () => {
			const formatFilter = getFormatFilter();
			const result = formatFilter({ key: "filter_isActive", value: "false" });
			expect(result).not.toBeNull();
			expect(result?.label).toBe("Statut");
			expect(result?.displayValue).toBe("Inactif");
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
