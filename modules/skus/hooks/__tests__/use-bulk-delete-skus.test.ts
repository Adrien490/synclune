import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkDeleteSkus } = vi.hoisted(() => ({
	mockBulkDeleteSkus: vi.fn(),
}));

vi.mock("@/modules/skus/actions/bulk-delete-skus", () => ({
	bulkDeleteSkus: mockBulkDeleteSkus,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useBulkDeleteSkus } from "../use-bulk-delete-skus";

const SUCCESS = { status: "success" as const, message: "2 SKUs supprimés" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useBulkDeleteSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteSkus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and deleteSkus", () => {
		const { result } = renderHook(() => useBulkDeleteSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deleteSkus).toBe("function");
	});

	it("deleteSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeleteSkus());
		await act(async () => {
			result.current.deleteSkus(["id-1", "id-2"]);
		});
		const formData = mockBulkDeleteSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteSkus({ onSuccess }));
		await act(async () => {
			result.current.deleteSkus(["id-1"]);
		});
		expect(onSuccess).toHaveBeenCalledWith("2 SKUs supprimés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteSkus({ onSuccess }));
		await act(async () => {
			result.current.deleteSkus(["id-1"]);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
