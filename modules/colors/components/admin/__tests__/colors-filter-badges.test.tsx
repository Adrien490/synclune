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

import { ColorsFilterBadges } from "../colors-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ColorsFilterBadges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing", () => {
		render(<ColorsFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("passes a formatFilter function to FilterBadges", () => {
		render(<ColorsFilterBadges />);
		expect(screen.getByTestId("format-filter-result")).toBeInTheDocument();
	});

	// ─── formatColorFilter logic ──────────────────────────────────────────────

	it("calls formatStatusFilter for isActive filter with correct labels", () => {
		render(<ColorsFilterBadges />);
		expect(mockFormatStatusFilter).toHaveBeenCalledWith("true", "Actives", "Inactives");
	});

	it("returns formatted active label for isActive=true", () => {
		render(<ColorsFilterBadges />);
		const result = screen.getByTestId("format-filter-result");
		expect(result.textContent).toContain("Actives");
	});
});
