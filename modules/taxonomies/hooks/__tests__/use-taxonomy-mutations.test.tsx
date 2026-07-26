import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseActionWithToast, mockUseRefreshAction } = vi.hoisted(() => ({
	mockUseActionWithToast: vi.fn(),
	mockUseRefreshAction: vi.fn(),
}));

vi.mock("@/shared/hooks/use-action-with-toast", () => ({
	useActionWithToast: mockUseActionWithToast,
	useRefreshAction: mockUseRefreshAction,
}));

// `withCallbacks` / `createToastCallbacks` sont testés chez eux. On en reproduit
// ici le CONTRAT minimal (routage status → onSuccess/onError) sans les toasts :
// un mock qui jetterait les callbacks rendrait ce fichier aveugle au câblage
// onSuccess/onError, qui est précisément ce qu'on veut couvrir.
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: (options: Record<string, unknown>) => options,
}));
vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (
		action: (prev: unknown, formData: FormData) => Promise<{ status?: string }>,
		callbacks: {
			onSuccess?: (result: unknown) => void;
			onError?: (result: unknown) => void;
		},
	) => {
		return async (prev: unknown, formData: FormData) => {
			const result = await action(prev, formData);
			if (result.status === "success") callbacks.onSuccess?.(result);
			else callbacks.onError?.(result);
			return result;
		};
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
	useTaxonomyDelete,
	useTaxonomyRefresh,
	useTaxonomyToggleStatus,
	useTaxonomyDuplicate,
} from "../use-taxonomy-mutations";
import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";

const SUCCESS = { status: "success" as const, message: "OK" };

/** Lit une FormData en objet simple pour des assertions lisibles. */
function formDataToObject(formData: FormData): Record<string, string> {
	return Object.fromEntries(
		[...formData.entries()].map(([key, value]) => [key, String(value)]),
	) as Record<string, string>;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockUseActionWithToast.mockReturnValue({ action: vi.fn(), isPending: false, state: undefined });
	mockUseRefreshAction.mockReturnValue({ action: vi.fn(), isPending: false });
});

// ============================================================================
// useTaxonomyDelete
// ============================================================================

describe("useTaxonomyDelete", () => {
	it("délègue à useActionWithToast avec l'action fournie", () => {
		const action = vi.fn();
		renderHook(() => useTaxonomyDelete(action));

		expect(mockUseActionWithToast).toHaveBeenCalledWith(action, expect.any(Object));
	});

	it("propage le message de succès à l'appelant", () => {
		const onSuccess = vi.fn();
		renderHook(() => useTaxonomyDelete(vi.fn(), { onSuccess }));

		// Rejoue le callback que le hook a passé à useActionWithToast.
		const options = mockUseActionWithToast.mock.calls[0]?.[1] as {
			onSuccess: (result: { message?: string }) => void;
		};
		options.onSuccess({ message: "Couleur supprimée" });

		expect(onSuccess).toHaveBeenCalledWith("Couleur supprimée");
	});

	it("n'appelle pas onSuccess sans message", () => {
		const onSuccess = vi.fn();
		renderHook(() => useTaxonomyDelete(vi.fn(), { onSuccess }));

		const options = mockUseActionWithToast.mock.calls[0]?.[1] as {
			onSuccess: (result: { message?: string }) => void;
		};
		options.onSuccess({});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useTaxonomyRefresh
// ============================================================================

describe("useTaxonomyRefresh", () => {
	it("délègue à useRefreshAction en transmettant onSuccess", () => {
		const action = vi.fn();
		const onSuccess = vi.fn();
		renderHook(() => useTaxonomyRefresh(action, { onSuccess }));

		expect(mockUseRefreshAction).toHaveBeenCalledWith(action, { onSuccess });
	});
});

// ============================================================================
// useTaxonomyToggleStatus
// ============================================================================

describe("useTaxonomyToggleStatus", () => {
	// Le champ d'identifiant diffère selon l'entité (`id` vs `productTypeId`). Un
	// mauvais nom produit un formulaire que la Server Action rejette en validation,
	// sans erreur de compilation pour le signaler.
	it("nomme le champ d'id `id` pour une couleur", async () => {
		const action = vi.fn().mockResolvedValue(SUCCESS);
		const { result } = renderHook(() => useTaxonomyToggleStatus(action, TAXONOMY_CONFIG.color));

		await act(async () => {
			result.current.toggleStatus("color-1", false);
		});

		expect(action).toHaveBeenCalledTimes(1);
		expect(formDataToObject(action.mock.calls[0]![1] as FormData)).toEqual({
			id: "color-1",
			isActive: "false",
		});
	});

	it("nomme le champ d'id `productTypeId` pour un type de bijou", async () => {
		const action = vi.fn().mockResolvedValue(SUCCESS);
		const { result } = renderHook(() =>
			useTaxonomyToggleStatus(action, TAXONOMY_CONFIG["product-type"]),
		);

		await act(async () => {
			result.current.toggleStatus("pt-1", true);
		});

		expect(formDataToObject(action.mock.calls[0]![1] as FormData)).toEqual({
			productTypeId: "pt-1",
			isActive: "true",
		});
	});

	it("sérialise isActive en chaîne « true »/« false »", async () => {
		const action = vi.fn().mockResolvedValue(SUCCESS);
		const { result } = renderHook(() => useTaxonomyToggleStatus(action, TAXONOMY_CONFIG.material));

		await act(async () => {
			result.current.toggleStatus("mat-1", true);
		});
		await act(async () => {
			result.current.toggleStatus("mat-1", false);
		});

		// Les actions comparent `formData.get("isActive") === "true"`.
		expect(formDataToObject(action.mock.calls[0]![1] as FormData).isActive).toBe("true");
		expect(formDataToObject(action.mock.calls[1]![1] as FormData).isActive).toBe("false");
	});
});

// ============================================================================
// useTaxonomyDuplicate
// ============================================================================

describe("useTaxonomyDuplicate", () => {
	it.each([
		["color", "colorId"],
		["material", "materialId"],
		["product-type", "productTypeId"],
	] as const)("%s : nomme le champ d'id `%s`", async (kind, expectedField) => {
		const action = vi.fn().mockResolvedValue(SUCCESS);
		const { result } = renderHook(() => useTaxonomyDuplicate(action, TAXONOMY_CONFIG[kind]));

		await act(async () => {
			result.current.duplicate("entity-1");
		});

		expect(formDataToObject(action.mock.calls[0]![1] as FormData)).toEqual({
			[expectedField]: "entity-1",
		});
	});

	it("normalise `name` (couleurs/matériaux) en displayName", async () => {
		const onSuccess = vi.fn();
		const action = vi.fn().mockResolvedValue({
			status: "success",
			message: "Dupliquée",
			data: { id: "c2", slug: "rose-copie", name: "Rose (copie)" },
		});
		const { result } = renderHook(() =>
			useTaxonomyDuplicate(action, TAXONOMY_CONFIG.color, { onSuccess }),
		);

		await act(async () => {
			result.current.duplicate("c1");
		});

		expect(onSuccess).toHaveBeenCalledWith("Dupliquée", {
			id: "c2",
			slug: "rose-copie",
			displayName: "Rose (copie)",
		});
	});

	it("normalise `label` (types de bijoux) en displayName", async () => {
		const onSuccess = vi.fn();
		const action = vi.fn().mockResolvedValue({
			status: "success",
			message: "Dupliqué",
			data: { id: "t2", slug: "bague-copie", label: "Bague (copie)" },
		});
		const { result } = renderHook(() =>
			useTaxonomyDuplicate(action, TAXONOMY_CONFIG["product-type"], { onSuccess }),
		);

		await act(async () => {
			result.current.duplicate("t1");
		});

		expect(onSuccess).toHaveBeenCalledWith("Dupliqué", {
			id: "t2",
			slug: "bague-copie",
			displayName: "Bague (copie)",
		});
	});

	it("n'appelle pas onSuccess quand la payload est incomplète", async () => {
		const onSuccess = vi.fn();
		// `slug` manquant : rediriger vers `${basePath}/undefined` serait pire que rien.
		const action = vi.fn().mockResolvedValue({
			status: "success",
			message: "Dupliquée",
			data: { id: "c2", name: "Rose (copie)" },
		});
		const { result } = renderHook(() =>
			useTaxonomyDuplicate(action, TAXONOMY_CONFIG.color, { onSuccess }),
		);

		await act(async () => {
			result.current.duplicate("c1");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("propage le message d'erreur", async () => {
		const onError = vi.fn();
		const action = vi.fn().mockResolvedValue({ status: "error", message: "Limite atteinte" });
		const { result } = renderHook(() =>
			useTaxonomyDuplicate(action, TAXONOMY_CONFIG.color, { onError }),
		);

		await act(async () => {
			result.current.duplicate("c1");
		});

		expect(onError).toHaveBeenCalledWith("Limite atteinte");
	});
});
