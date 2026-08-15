import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDuplicateVariant } = vi.hoisted(() => ({
	mockDuplicateVariant: vi.fn(),
}));

vi.mock("@/modules/variants/actions/duplicate-variant", () => ({
	duplicateVariant: mockDuplicateVariant,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useDuplicateVariant } from "../use-duplicate-variant";

const SUCCESS = {
	status: "success" as const,
	message: "VARIANT dupliqué",
	data: {
		id: "new-variant-id",
		variant: "REF-001-COPIE",
		productId: "prod-1",
		productSlug: "bracelet-lune",
	},
};
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useDuplicateVariant", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateVariant.mockResolvedValue(SUCCESS);
	});

	it("returns duplicate and isPending", () => {
		const { result } = renderHook(() => useDuplicateVariant());
		expect(typeof result.current.duplicate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("duplicate appends variantId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateVariant());
		await act(async () => {
			result.current.duplicate("variant-123", "Bague Or");
		});
		const formData = mockDuplicateVariant.mock.calls[0]?.[1] as FormData;
		expect(formData.get("variantId")).toBe("variant-123");
	});

	it("calls onSuccess with (message, { id, variant, productId, productSlug }) when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onSuccess }));
		await act(async () => {
			result.current.duplicate("variant-123", "Bague Or");
		});
		expect(onSuccess).toHaveBeenCalledWith("VARIANT dupliqué", {
			id: "new-variant-id",
			variant: "REF-001-COPIE",
			productId: "prod-1",
			productSlug: "bracelet-lune",
		});
	});

	it("calls onError with message when action fails", async () => {
		mockDuplicateVariant.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onError }));
		await act(async () => {
			result.current.duplicate("variant-123", "Bague Or");
		});
		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateVariant.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onSuccess }));
		await act(async () => {
			result.current.duplicate("variant-123", "Bague Or");
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
