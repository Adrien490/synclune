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

/**
 * ⚠️ Forme du `data` renvoyé par `actions/duplicate-variant.ts` — `{ variantId }`,
 * et rien d'autre. La version précédente de ce fichier fabriquait
 * `{ id, variant, productId, productSlug }`, une forme que l'action n'a jamais
 * produite : le test validait le garde du hook contre une fiction, restait vert,
 * et la duplication ne rendait AUCUN retour visible en production.
 * L'autre moitié du verrou vit dans `actions/__tests__/duplicate-variant.test.ts`,
 * qui asserte que l'action émet bien cette clé.
 */
const SUCCESS_DATA = { variantId: "new-variant-id" };
const SUCCESS = {
	status: "success" as const,
	message: "VARIANT dupliqué",
	data: SUCCESS_DATA,
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
			result.current.duplicate("variant-123");
		});
		const formData = mockDuplicateVariant.mock.calls[0]?.[1] as FormData;
		expect(formData.get("variantId")).toBe("variant-123");
	});

	it("calls onSuccess with (message, { variantId }) when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onSuccess }));
		await act(async () => {
			result.current.duplicate("variant-123");
		});
		expect(onSuccess).toHaveBeenCalledWith("VARIANT dupliqué", { variantId: "new-variant-id" });
	});

	it("ignores a payload without variantId (garde de forme)", async () => {
		mockDuplicateVariant.mockResolvedValue({
			status: "success" as const,
			message: "VARIANT dupliqué",
			data: { id: "new-variant-id" },
		});
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onSuccess }));
		await act(async () => {
			result.current.duplicate("variant-123");
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("calls onError with message when action fails", async () => {
		mockDuplicateVariant.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onError }));
		await act(async () => {
			result.current.duplicate("variant-123");
		});
		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateVariant.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateVariant({ onSuccess }));
		await act(async () => {
			result.current.duplicate("variant-123");
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
