import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkUpdatePrice } = vi.hoisted(() => ({
	mockBulkUpdatePrice: vi.fn(),
}));

vi.mock("@/modules/skus/actions/bulk-update-price", () => ({
	bulkUpdatePrice: mockBulkUpdatePrice,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useBulkUpdatePrice } from "../use-bulk-update-price";

const SUCCESS = { status: "success" as const, message: "Prix mis à jour" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useBulkUpdatePrice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkUpdatePrice.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and updatePrice", () => {
		const { result } = renderHook(() => useBulkUpdatePrice());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.updatePrice).toBe("function");
	});

	it("updatePrice sends ids, mode, value, and updateCompareAtPrice in FormData", async () => {
		const { result } = renderHook(() => useBulkUpdatePrice());
		await act(async () => {
			result.current.updatePrice(["id-1", "id-2"], "percentage", 10, true);
		});
		const formData = mockBulkUpdatePrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
		expect(formData.get("mode")).toBe("percentage");
		expect(formData.get("value")).toBe("10");
		expect(formData.get("updateCompareAtPrice")).toBe("true");
	});

	it("updateCompareAtPrice defaults to false when not provided", async () => {
		const { result } = renderHook(() => useBulkUpdatePrice());
		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 30);
		});
		const formData = mockBulkUpdatePrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("updateCompareAtPrice")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdatePrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 25);
		});
		expect(onSuccess).toHaveBeenCalledWith("Prix mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkUpdatePrice.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdatePrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 25);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
