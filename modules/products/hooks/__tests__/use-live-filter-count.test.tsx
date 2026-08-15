import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterFormData } from "@/modules/products/services/product-filter-params.service";

const { mockCountAction } = vi.hoisted(() => ({
	mockCountAction: vi.fn(),
}));

vi.mock("../../actions/count-filtered-products", () => ({
	countFilteredProducts: mockCountAction,
}));

import { useLiveFilterCount } from "../use-live-filter-count";

// ============================================================================
// HELPERS
// ============================================================================

const baseValues: FilterFormData = {
	colors: [],
	materials: [],
	productTypes: [],
	priceRange: [0, 500],
	inStockOnly: false,
	sortBy: "created-descending",
};

function renderCount(initial?: Partial<Parameters<typeof useLiveFilterCount>[0]>) {
	return renderHook(
		(props: Parameters<typeof useLiveFilterCount>[0]) => useLiveFilterCount(props),
		{
			initialProps: {
				values: baseValues,
				maxPriceInEuros: 500,
				enabled: true,
				...initial,
			},
		},
	);
}

/** Résout les promesses en vol (l'action mockée résout en microtask). */
const flush = () => act(async () => {});

beforeEach(() => {
	vi.useFakeTimers();
	mockCountAction.mockResolvedValue({ kind: "success", count: 9 });
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

// ============================================================================
// TESTS
// ============================================================================

describe("useLiveFilterCount", () => {
	it("est inerte tant que enabled est faux (aucun réveil DB panneau fermé)", async () => {
		const { result } = renderCount({ enabled: false });
		await act(async () => {
			vi.advanceTimersByTime(1000);
		});
		expect(mockCountAction).not.toHaveBeenCalled();
		expect(result.current).toEqual({
			count: null,
			isUpdating: false,
			countUnavailable: false,
			relaxed: null,
		});
	});

	it("débounce : une seule requête après 300ms de silence", async () => {
		const { result, rerender } = renderCount();
		expect(result.current.isUpdating).toBe(true);

		// Deux changements rapprochés — le premier timer est annulé.
		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(200);
		});
		rerender({
			values: { ...baseValues, colors: ["or", "rose"] },
			maxPriceInEuros: 500,
			enabled: true,
		});
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(mockCountAction).toHaveBeenCalledTimes(1);
		expect(result.current.count).toBe(9);
		expect(result.current.isUpdating).toBe(false);
	});

	it("envoie lastChangedGroup quand UN seul groupe a changé", async () => {
		const { rerender } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(mockCountAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ lastChangedGroup: "colors" }),
		);
	});

	it("ignore une réponse périmée (garde anti-réordonnancement)", async () => {
		let resolveFirst!: (v: unknown) => void;
		mockCountAction
			.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValueOnce({ kind: "success", count: 3 });

		const { result, rerender } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});

		// Nouvelle saisie pendant que la 1ʳᵉ réponse est en vol.
		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();
		expect(result.current.count).toBe(3);

		// La 1ʳᵉ réponse atterrit APRÈS : elle ne doit pas écraser la 2ᵉ.
		await act(async () => {
			resolveFirst({ kind: "success", count: 999 });
		});
		expect(result.current.count).toBe(3);
	});

	it("conserve le dernier chiffre connu sur error, sans rester « mise à jour »", async () => {
		const { result, rerender } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();
		expect(result.current.count).toBe(9);

		mockCountAction.mockResolvedValue({ kind: "error" });
		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(result.current.count).toBe(9);
		expect(result.current.isUpdating).toBe(false);
		// …mais il signale que ce 9 répond aux ANCIENS critères : l'appelant doit
		// retomber sur un libellé neutre plutôt que promettre « Voir les 9 pièces »
		// pour une sélection dont il ne connaît pas le total.
		expect(result.current.countUnavailable).toBe(true);
	});

	it("countUnavailable retombe à faux dès qu'un recomptage aboutit", async () => {
		mockCountAction.mockResolvedValue({ kind: "error" });
		const { result, rerender } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();
		expect(result.current.countUnavailable).toBe(true);

		mockCountAction.mockResolvedValue({ kind: "success", count: 4 });
		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(result.current.count).toBe(4);
		expect(result.current.countUnavailable).toBe(false);
	});

	it("garde lastChangedGroup quand deux groupes bougent dans la MÊME fenêtre de debounce", async () => {
		// `prevValuesRef` était avancé à la PROGRAMMATION du debounce, donc sur des
		// valeurs jamais envoyées : le second changement se comparait au premier
		// (2 groupes changés → aucun `lastChangedGroup`), et la sortie chiffrée de
		// l'état vide retombait en silence sur la copie générique.
		const { rerender } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();
		mockCountAction.mockClear();

		// Deux frappes à 100 ms d'intervalle : la première est annulée par le debounce.
		rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
		await act(async () => {
			vi.advanceTimersByTime(100);
		});
		rerender({
			values: { ...baseValues, colors: ["or", "rose"] },
			maxPriceInEuros: 500,
			enabled: true,
		});
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(mockCountAction).toHaveBeenCalledTimes(1);
		expect(mockCountAction).toHaveBeenLastCalledWith(
			expect.objectContaining({ lastChangedGroup: "colors" }),
		);
	});

	describe("graine serveur (initialCount)", () => {
		it("n'envoie AUCUNE requête à l'ouverture quand le compte initial est semé", async () => {
			const { result } = renderCount({ initialCount: 48 });

			// Le chiffre est là dès le premier rendu — pas de libellé neutre transitoire.
			expect(result.current.count).toBe(48);
			expect(result.current.isUpdating).toBe(false);

			await act(async () => {
				vi.advanceTimersByTime(1000);
			});
			// C'est tout l'intérêt : un réveil Neon de moins par ouverture de panneau.
			expect(mockCountAction).not.toHaveBeenCalled();
		});

		it("recompte dès que les valeurs s'écartent de la graine", async () => {
			const { result, rerender } = renderCount({ initialCount: 48 });
			expect(mockCountAction).not.toHaveBeenCalled();

			rerender({ values: { ...baseValues, colors: ["or"] }, maxPriceInEuros: 500, enabled: true });
			expect(result.current.isUpdating).toBe(true);

			await act(async () => {
				vi.advanceTimersByTime(300);
			});
			await flush();

			expect(mockCountAction).toHaveBeenCalledTimes(1);
			expect(result.current.count).toBe(9);
		});

		it("sans graine, le comportement d'origine est conservé", async () => {
			const { result } = renderCount();
			expect(result.current.count).toBeNull();
			expect(result.current.isUpdating).toBe(true);

			await act(async () => {
				vi.advanceTimersByTime(300);
			});
			await flush();

			expect(mockCountAction).toHaveBeenCalledTimes(1);
		});
	});

	it("expose relaxed uniquement à 0 résultat", async () => {
		mockCountAction.mockResolvedValue({
			kind: "success",
			count: 0,
			relaxed: { group: "colors", count: 24 },
		});
		const { result } = renderCount();
		await act(async () => {
			vi.advanceTimersByTime(300);
		});
		await flush();

		expect(result.current.count).toBe(0);
		expect(result.current.relaxed).toEqual({ group: "colors", count: 24 });
	});
});
