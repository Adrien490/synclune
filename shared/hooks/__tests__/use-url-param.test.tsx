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

	it("update() pushes a URL with the new param and drops the cursor by default", () => {
		setSearchParams("sort=newest&cursor=tok_4&direction=forward&q=test");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("price-asc");
		});

		expect(mockPush).toHaveBeenCalledTimes(1);
		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.get("sort")).toBe("price-asc");
		expect(params.has("cursor")).toBe(false); // reset
		expect(params.has("direction")).toBe(false);
		expect(params.get("q")).toBe("test"); // preserved
	});

	it("update() forwards scroll: false to router.push (no jump on filter change)", () => {
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("price-asc");
		});

		expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
	});

	it("update() with resetPagination=false preserves the current cursor", () => {
		setSearchParams("sort=newest&cursor=tok_4");
		const { result } = renderHook(() => useUrlParam("sort", { resetPagination: false }));

		act(() => {
			result.current.update("price-asc");
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.get("sort")).toBe("price-asc");
		expect(params.get("cursor")).toBe("tok_4"); // preserved
	});

	it("update() with empty string deletes the param from the URL", () => {
		setSearchParams("sort=newest&cursor=tok_2");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.update("");
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.has("sort")).toBe(false);
		expect(params.has("cursor")).toBe(false);
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

	it("clear() removes the param and drops the cursor", () => {
		setSearchParams("sort=newest&cursor=tok_4");
		const { result } = renderHook(() => useUrlParam("sort"));

		act(() => {
			result.current.clear();
		});

		const pushedUrl = mockPush.mock.calls[0]![0] as string;
		const params = new URLSearchParams(pushedUrl.replace(/^\?/, ""));
		expect(params.has("sort")).toBe(false);
		expect(params.has("cursor")).toBe(false);
	});

	// ----------------------------------------------------------------
	// isPending
	// ----------------------------------------------------------------

	it("exposes isPending (false when idle)", () => {
		const { result } = renderHook(() => useUrlParam("sort"));
		expect(result.current.isPending).toBe(false);
	});
});
