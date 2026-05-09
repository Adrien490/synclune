import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useActiveListControls } from "../use-active-list-controls";

const mockUseSearchParams = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
	useSearchParams: mockUseSearchParams,
}));

function setParams(qs: string) {
	mockUseSearchParams.mockReturnValue(new URLSearchParams(qs));
}

describe("useActiveListControls", () => {
	it("returns default falsy values when no params", () => {
		setParams("");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.hasActiveSearch).toBe(false);
		expect(result.current.searchValue).toBe("");
		expect(result.current.hasActiveSort).toBe(false);
		expect(result.current.sortValue).toBeNull();
		expect(result.current.activeFilterCount).toBe(0);
		expect(result.current.hasActiveFilter).toBe(false);
	});

	it("detects an active search", () => {
		setParams("search=ring");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.hasActiveSearch).toBe(true);
		expect(result.current.searchValue).toBe("ring");
	});

	it("treats an empty search= as inactive", () => {
		setParams("search=");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.hasActiveSearch).toBe(false);
	});

	it("detects an active sort", () => {
		setParams("sortBy=createdAt-desc");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.hasActiveSort).toBe(true);
		expect(result.current.sortValue).toBe("createdAt-desc");
	});

	it("counts only filter_ prefixed keys", () => {
		setParams("search=foo&sortBy=name&filter_status=ACTIVE&filter_total=20&page=2");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.activeFilterCount).toBe(2);
		expect(result.current.hasActiveFilter).toBe(true);
	});

	it("supports a custom filter prefix", () => {
		setParams("rev_rating=4&rev_status=PUBLISHED&filter_other=x");
		const { result } = renderHook(() => useActiveListControls("rev_"));
		expect(result.current.activeFilterCount).toBe(2);
		expect(result.current.hasActiveFilter).toBe(true);
	});

	it("returns 0 filters when only non-prefix keys are set", () => {
		setParams("search=q&sortBy=name");
		const { result } = renderHook(() => useActiveListControls());
		expect(result.current.activeFilterCount).toBe(0);
		expect(result.current.hasActiveFilter).toBe(false);
	});
});
