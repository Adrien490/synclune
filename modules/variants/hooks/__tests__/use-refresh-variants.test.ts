import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRefreshVariants } = vi.hoisted(() => ({
	mockRefreshVariants: vi.fn(),
}));

vi.mock("@/modules/variants/actions/refresh-variants", () => ({
	refreshVariants: mockRefreshVariants,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useRefreshVariants } from "../use-refresh-variants";

const SUCCESS = { status: "success" as const, message: "Cache invalidé" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useRefreshVariants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshVariants.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshVariants());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls refreshVariants action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshVariants());
		await act(async () => {
			result.current.refresh();
		});
		expect(mockRefreshVariants).toHaveBeenCalledTimes(1);
	});

	it("appends productId to FormData when provided", async () => {
		const { result } = renderHook(() => useRefreshVariants({ productId: "product-42" }));
		await act(async () => {
			result.current.refresh();
		});
		const formData = mockRefreshVariants.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-42");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshVariants({ onSuccess }));
		await act(async () => {
			result.current.refresh();
		});
		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshVariants.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshVariants({ onSuccess }));
		await act(async () => {
			result.current.refresh();
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
