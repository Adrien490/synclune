import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRefreshSkus } = vi.hoisted(() => ({
	mockRefreshSkus: vi.fn(),
}));

vi.mock("@/modules/skus/actions/refresh-skus", () => ({
	refreshSkus: mockRefreshSkus,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useRefreshSkus } from "../use-refresh-skus";

const SUCCESS = { status: "success" as const, message: "Cache invalidé" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useRefreshSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshSkus.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshSkus());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls refreshSkus action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshSkus());
		await act(async () => {
			result.current.refresh();
		});
		expect(mockRefreshSkus).toHaveBeenCalledTimes(1);
	});

	it("appends productId to FormData when provided", async () => {
		const { result } = renderHook(() => useRefreshSkus({ productId: "product-42" }));
		await act(async () => {
			result.current.refresh();
		});
		const formData = mockRefreshSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-42");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshSkus({ onSuccess }));
		await act(async () => {
			result.current.refresh();
		});
		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshSkus({ onSuccess }));
		await act(async () => {
			result.current.refresh();
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
