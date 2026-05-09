import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPush, mockUseSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), forward: vi.fn() }),
	useSearchParams: () => mockUseSearchParams(),
}));

import { useUrlParam } from "../use-url-param";

function setSearchParams(query: string) {
	// useSearchParams returns a ReadonlyURLSearchParams (compatible with URLSearchParams API)
	mockUseSearchParams.mockReturnValue(new URLSearchParams(query));
}

describe("useUrlParam", () => {
	beforeEach(() => {
		mockPush.mockReset();
		mockUseSearchParams.mockReset();
		setSearchParams("");
	});

	// ----------------------------------------------------------------
	// Initial value
	// ----------------------------------------------------------------

	it("returns the empty string when the param is absent from the URL", () => {
		const { result } = renderHook(() => useUrlParam("sort"));
		expect(result.current.value).toBe("");
	});

	it("reads the current value from the URL", () => {
		setSearchParams("sort=newest&page=2");
		const { result } = renderHook(() => useUrlParam("sort"));
		expect(result.current.value).toBe("newest");
	});

	// ----------------------------------------------------------------
	// update()
	// ----------------------------------------------------------------

	it("update() pushes a URL with the new param and resets page=1 by default", () => {
		setSearchParams("sort=newest&page=4&q=test");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("price-asc");
		});

		expect(mockPush).toHaveBeenCalledTimes(1);
		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.get("sort")).toBe("price-asc");
		expect(params.get("page")).toBe("1"); // reset
		expect(params.get("q")).toBe("test"); // preserved
	});

	it("update() forwards scroll: false to router.push (no jump on filter change)", () => {
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("price-asc");
		});

		expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
	});

	it("update() with resetPage=false preserves the current page", () => {
		setSearchParams("sort=newest&page=4");
		const { result } = renderHook(() => useUrlParam("sort", { resetPage: false }));

		act(() => {
			result.current.update("price-asc");
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.get("sort")).toBe("price-asc");
		expect(params.get("page")).toBe("4"); // preserved
	});

	it("update() with empty string deletes the param from the URL", () => {
		setSearchParams("sort=newest&page=2");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("");
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.has("sort")).toBe(false);
		expect(params.get("page")).toBe("1");
	});

	it("update() preserves unrelated search params", () => {
		setSearchParams("sort=newest&q=ring&category=bracelet");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("price-asc");
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.get("q")).toBe("ring");
		expect(params.get("category")).toBe("bracelet");
	});

	// ----------------------------------------------------------------
	// clear()
	// ----------------------------------------------------------------

	it("clear() removes the param and resets page=1", () => {
		setSearchParams("sort=newest&page=4");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.clear();
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.has("sort")).toBe(false);
		expect(params.get("page")).toBe("1");
	});

	// ----------------------------------------------------------------
	// isPending
	// ----------------------------------------------------------------

	it("exposes isPending (false when idle)", () => {
		const { result } = renderHook(() => useUrlParam("sort"));
		expect(result.current.isPending).toBe(false);
	});
});
