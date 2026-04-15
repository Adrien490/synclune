import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSetDefaultSku } = vi.hoisted(() => ({
	mockSetDefaultSku: vi.fn(),
}));

vi.mock("@/modules/skus/actions/set-default-sku", () => ({
	setDefaultSku: mockSetDefaultSku,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useSetDefaultSku } from "../use-set-default-sku";

const SUCCESS = { status: "success" as const, message: "SKU par défaut défini" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useSetDefaultSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSetDefaultSku.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and setAsDefault", () => {
		const { result } = renderHook(() => useSetDefaultSku());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.setAsDefault).toBe("function");
	});

	it("setAsDefault appends skuId to FormData", async () => {
		const { result } = renderHook(() => useSetDefaultSku());
		await act(async () => {
			result.current.setAsDefault("sku-123");
		});
		const formData = mockSetDefaultSku.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultSku({ onSuccess }));
		await act(async () => {
			result.current.setAsDefault("sku-123");
		});
		expect(onSuccess).toHaveBeenCalledWith("SKU par défaut défini");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSetDefaultSku.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultSku({ onSuccess }));
		await act(async () => {
			result.current.setAsDefault("sku-123");
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
