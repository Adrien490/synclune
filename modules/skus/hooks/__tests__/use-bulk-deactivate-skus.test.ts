import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkDeactivateSkus } = vi.hoisted(() => ({
	mockBulkDeactivateSkus: vi.fn(),
}));

vi.mock("@/modules/skus/actions/bulk-deactivate-skus", () => ({
	bulkDeactivateSkus: mockBulkDeactivateSkus,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useBulkDeactivateSkus } from "../use-bulk-deactivate-skus";

const SUCCESS = { status: "success" as const, message: "2 SKUs désactivés" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useBulkDeactivateSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeactivateSkus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and deactivateSkus", () => {
		const { result } = renderHook(() => useBulkDeactivateSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deactivateSkus).toBe("function");
	});

	it("deactivateSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeactivateSkus());
		await act(async () => {
			result.current.deactivateSkus(["id-1", "id-2"]);
		});
		const formData = mockBulkDeactivateSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateSkus({ onSuccess }));
		await act(async () => {
			result.current.deactivateSkus(["id-1"]);
		});
		expect(onSuccess).toHaveBeenCalledWith("2 SKUs désactivés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeactivateSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateSkus({ onSuccess }));
		await act(async () => {
			result.current.deactivateSkus(["id-1"]);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
