import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFormatFilter } = vi.hoisted(() => ({
	mockFormatFilter: {
		current: null as ((filter: unknown) => { label: string; displayValue: string }) | null,
	},
}));

vi.mock("@/shared/components/filter-badges", () => ({
	FilterBadges: ({
		formatFilter,
	}: {
		formatFilter: (filter: unknown) => { label: string; displayValue: string };
	}) => {
		mockFormatFilter.current = formatFilter;
		return <div data-testid="filter-badges" />;
	},
}));

import { CollectionsFilterBadges } from "../collections-filter-badges";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionsFilterBadges", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFormatFilter.current = null;
	});

	it("renders the FilterBadges component", () => {
		render(<CollectionsFilterBadges />);
		expect(screen.getByTestId("filter-badges")).toBeInTheDocument();
	});

	it("formats hasProducts=true filter correctly", () => {
		render(<CollectionsFilterBadges />);
		const result = mockFormatFilter.current!({ key: "filter_hasProducts", value: "true" });
		expect(result.label).toBe("Bijoux");
		expect(result.displayValue).toBe("Avec bijoux");
	});

	it("formats hasProducts=false filter correctly", () => {
		render(<CollectionsFilterBadges />);
		const result = mockFormatFilter.current!({ key: "filter_hasProducts", value: "false" });
		expect(result.label).toBe("Bijoux");
		expect(result.displayValue).toBe("Sans bijoux");
	});

	it("formats unknown filter with default label and value", () => {
		render(<CollectionsFilterBadges />);
		const result = mockFormatFilter.current!({ key: "filter_search", value: "bague" });
		expect(result.label).toBe("search");
		expect(result.displayValue).toBe("bague");
	});
});
