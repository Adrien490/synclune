import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFormatStatusFilter } = vi.hoisted(() => ({
	mockFormatStatusFilter: vi.fn((value: string, active: string, inactive: string) => ({
		label: "isActive",
		displayValue: value === "true" ? active : inactive,
	})),
}));

vi.mock("@/shared/utils/format-status-filter", () => ({
	formatStatusFilter: mockFormatStatusFilter,
}));

vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: ({
		formatFilter,
	}: {
		formatFilter: (filter: { key: string; value: unknown }) => {
			label: string;
			displayValue: string;
		};
	}) => (
		<div data-testid="filter-badges">
			<div data-testid="format-filter-result">
				{JSON.stringify(formatFilter({ key: "filter_isActive", value: "true" }))}
			</div>
		</div>
	),
}));

import { TaxonomyFilterBadges } from "@/modules/taxonomies/components/taxonomy-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("TaxonomyFilterBadges — color", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		render(<TaxonomyFilterBadges kind="color" />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function to FilterBadges", () => {
		render(<TaxonomyFilterBadges kind="color" />);
		expect(screen.getByTestId("format-filter-result")).toBeInTheDocument();
	});

	// ─── formatColorFilter logic ──────────────────────────────────────────────

	it("calls formatStatusFilter for isActive filter with correct labels", () => {
		render(<TaxonomyFilterBadges kind="color" />);
		expect(mockFormatStatusFilter).toHaveBeenCalledWith("true", "Active", "Inactive");
	});

	it("returns formatted active label for isActive=true", () => {
		render(<TaxonomyFilterBadges kind="color" />);
		const result = screen.getByTestId("format-filter-result");
		expect(result.textContent).toContain("Active");
	});
});
