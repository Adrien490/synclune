import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdateVariantPrice } = vi.hoisted(() => ({
	mockUpdateVariantPrice: vi.fn(),
}));

vi.mock("@/modules/variants/actions/update-variant-price", () => ({
	updateVariantPrice: mockUpdateVariantPrice,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useUpdateVariantPrice } from "../use-update-variant-price";

const SUCCESS = { status: "success" as const, message: "Prix mis à jour" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useUpdateVariantPrice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateVariantPrice.mockResolvedValue(SUCCESS);
	});

	it("returns updatePrice and isPending", () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		expect(typeof result.current.updatePrice).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("updatePrice appends variantId and priceEuros to FormData", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", 30.0);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("variantId")).toBe("variant-123");
		expect(formData.get("priceEuros")).toBe("30");
	});

	/**
	 * Retrait de l'override : le serveur lit une CHAÎNE VIDE comme « la variante
	 * retombe sur le prix du produit » (`optionalPriceEurosSchema`). Ne pas
	 * envoyer le champ du tout laisserait `safeFormGet` renvoyer `null`, que le
	 * schéma traduit aussi en vide — mais c'est la chaîne vide qui est le contrat
	 * explicite, et le formulaire n'a aucun autre geste pour délier un prix.
	 */
	it("sends an empty priceEuros to remove the override", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", null);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("priceEuros")).toBe("");
	});

	it("never sends a compareAtPriceEuros field (colonne supprimée du schéma lean)", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", 30.0);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("compareAtPriceEuros")).toBeNull();
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice("variant-123", 30.0);
		});
		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("calls onError with message when action fails", async () => {
		mockUpdateVariantPrice.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onError }));
		await act(async () => {
			result.current.updatePrice("variant-123", 30.0);
		});
		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateVariantPrice.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice("variant-123", 30.0);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
