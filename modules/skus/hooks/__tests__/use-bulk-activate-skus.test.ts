import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkActivateSkus } = vi.hoisted(() => ({
	mockBulkActivateSkus: vi.fn(),
}));

vi.mock("@/modules/skus/actions/bulk-activate-skus", () => ({
	bulkActivateSkus: mockBulkActivateSkus,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useBulkActivateSkus } from "../use-bulk-activate-skus";

const SUCCESS = { status: "success" as const, message: "3 SKUs activés" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useBulkActivateSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkActivateSkus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and activateSkus", () => {
		const { result } = renderHook(() => useBulkActivateSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.activateSkus).toBe("function");
	});

	it("activateSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkActivateSkus());
		await act(async () => {
			result.current.activateSkus(["id-1", "id-2"]);
		});
		const formData = mockBulkActivateSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateSkus({ onSuccess }));
		await act(async () => {
			result.current.activateSkus(["id-1"]);
		});
		expect(onSuccess).toHaveBeenCalledWith("3 SKUs activés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkActivateSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateSkus({ onSuccess }));
		await act(async () => {
			result.current.activateSkus(["id-1"]);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
