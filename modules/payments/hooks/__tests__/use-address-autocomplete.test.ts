import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { SearchAddressResult } from "@/modules/addresses/types/search-address.types";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("@/modules/addresses/data/search-address", () => ({
	searchAddressForCheckout: vi.fn(),
}));

import { searchAddressForCheckout } from "@/modules/addresses/data/search-address";
import { useAddressAutocomplete } from "../use-address-autocomplete";

// ============================================================================
// Fixtures
// ============================================================================

const mockResults: SearchAddressResult[] = [
	{
		fulltext: "12 Rue de la Paix, 75002 Paris",
		street: "Rue de la Paix",
		zipcode: "75002",
		city: "Paris",
		coordinates: { longitude: 2.3316, latitude: 48.8698 },
		classification: 7,
		kind: "street",
		type: "StreetAddress",
		label: "12 Rue de la Paix, 75002 Paris",
		postcode: "75002",
		housenumber: "12",
	},
];

const mockResultsDE: SearchAddressResult[] = [
	{
		fulltext: "Unter den Linden 1, 10117 Berlin",
		street: "Unter den Linden",
		zipcode: "10117",
		city: "Berlin",
		coordinates: { longitude: 13.3798, latitude: 52.5163 },
		classification: 8,
		kind: "street",
		type: "StreetAddress",
		label: "Unter den Linden 1, 10117 Berlin",
		postcode: "10117",
		housenumber: "1",
	},
];

function makeSearchResult(addresses: SearchAddressResult[], error = false) {
	return { addresses, query: "test", limit: 5, error: error || undefined };
}

// ============================================================================
// Tests
// ============================================================================

describe("useAddressAutocomplete", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// --------------------------------------------------------------------------
	// Short query guard
	// --------------------------------------------------------------------------

	it("returns empty suggestions when query has 0 chars", () => {
		const { result } = renderHook(() => useAddressAutocomplete("", "FR"));

		expect(result.current.suggestions).toEqual([]);
		expect(vi.mocked(searchAddressForCheckout)).not.toHaveBeenCalled();
	});

	it("returns empty suggestions when query has 1 char", () => {
		const { result } = renderHook(() => useAddressAutocomplete("R", "FR"));

		expect(result.current.suggestions).toEqual([]);
		expect(vi.mocked(searchAddressForCheckout)).not.toHaveBeenCalled();
	});

	it("does not call server action when query < 2 chars", async () => {
		renderHook(() => useAddressAutocomplete("R", "FR"));

		// Flush all pending effects
		await act(async () => {});

		expect(vi.mocked(searchAddressForCheckout)).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Successful search
	// --------------------------------------------------------------------------

	it("calls searchAddressForCheckout when query >= 2 chars", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		renderHook(() => useAddressAutocomplete("Ru", "FR"));

		await act(async () => {});

		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenCalledOnce();
		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenCalledWith({
			text: "Ru",
			country: "FR",
		});
	});

	it("returns suggestions from server action result", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result } = renderHook(() => useAddressAutocomplete("Rue de la Paix", "FR"));

		await act(async () => {});

		expect(result.current.suggestions).toEqual(mockResults);
	});

	it("passes the correct country to server action", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResultsDE));

		renderHook(() => useAddressAutocomplete("Unter", "DE"));

		await act(async () => {});

		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenCalledWith({
			text: "Unter",
			country: "DE",
		});
	});

	it("clears error when result.error is false", async () => {
		// First call sets an error
		vi.mocked(searchAddressForCheckout).mockResolvedValueOnce(makeSearchResult([], true));

		const { result, rerender } = renderHook(
			({ query }: { query: string }) => useAddressAutocomplete(query, "FR"),
			{ initialProps: { query: "Rue" } },
		);

		await act(async () => {});
		expect(result.current.error).not.toBeNull();

		// Second call succeeds — error should clear
		vi.mocked(searchAddressForCheckout).mockResolvedValueOnce(makeSearchResult(mockResults, false));

		rerender({ query: "Rue de" });
		await act(async () => {});

		expect(result.current.error).toBeNull();
	});

	// --------------------------------------------------------------------------
	// Error handling
	// --------------------------------------------------------------------------

	it("sets error message when result.error is true", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult([], true));

		const { result } = renderHook(() => useAddressAutocomplete("Paris", "FR"));

		await act(async () => {});

		expect(result.current.error).toBe("La recherche d'adresses a echoue. Reessayez.");
	});

	it("sets error to null when result.error is falsy", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result } = renderHook(() => useAddressAutocomplete("Paris", "FR"));

		await act(async () => {});

		expect(result.current.error).toBeNull();
	});

	// --------------------------------------------------------------------------
	// Country change clears state synchronously
	// --------------------------------------------------------------------------

	it("clears results when country changes", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result, rerender } = renderHook(
			({ country }: { country: "FR" | "DE" }) => useAddressAutocomplete("Rue", country),
			{ initialProps: { country: "FR" as "FR" | "DE" } },
		);

		await act(async () => {});
		expect(result.current.suggestions).toEqual(mockResults);

		// Block the DE search so results stay empty after country switch
		vi.mocked(searchAddressForCheckout).mockReturnValue(new Promise(() => {}));

		rerender({ country: "DE" });

		// Results cleared synchronously at render time
		expect(result.current.suggestions).toEqual([]);
	});

	it("clears error when country changes", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult([], true));

		const { result, rerender } = renderHook(
			({ country }: { country: "FR" | "DE" }) => useAddressAutocomplete("Rue", country),
			{ initialProps: { country: "FR" as "FR" | "DE" } },
		);

		await act(async () => {});
		expect(result.current.error).not.toBeNull();

		// Block the DE search so we can inspect the cleared state
		vi.mocked(searchAddressForCheckout).mockReturnValue(new Promise(() => {}));

		rerender({ country: "DE" });

		expect(result.current.error).toBeNull();
	});

	// --------------------------------------------------------------------------
	// Stale response guard
	// --------------------------------------------------------------------------

	it("ignores stale responses when country changes rapidly", async () => {
		let resolveFirst!: (v: ReturnType<typeof makeSearchResult>) => void;
		const firstRequest = new Promise<ReturnType<typeof makeSearchResult>>((resolve) => {
			resolveFirst = resolve;
		});
		const secondRequest = Promise.resolve(makeSearchResult(mockResultsDE));

		vi.mocked(searchAddressForCheckout)
			.mockReturnValueOnce(firstRequest)
			.mockReturnValueOnce(secondRequest);

		const { result, rerender } = renderHook(
			({ country }: { country: "FR" | "DE" }) => useAddressAutocomplete("Rue", country),
			{ initialProps: { country: "FR" as "FR" | "DE" } },
		);

		// Switch country before first request resolves
		rerender({ country: "DE" });

		// Let the second (DE) request complete
		await act(async () => {});

		// Now resolve the stale first (FR) request
		await act(async () => {
			resolveFirst(makeSearchResult(mockResults));
		});

		// Only DE results should be visible — FR response was stale
		expect(result.current.suggestions).toEqual(mockResultsDE);
	});

	// --------------------------------------------------------------------------
	// retry()
	// --------------------------------------------------------------------------

	it("retry() triggers a new search call", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result } = renderHook(() => useAddressAutocomplete("Paris", "FR"));

		await act(async () => {});
		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenCalledTimes(1);

		await act(async () => {
			result.current.retry();
		});

		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenCalledTimes(2);
	});

	it("retry() re-sends the same query and country", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result } = renderHook(() => useAddressAutocomplete("Lyon", "FR"));

		await act(async () => {});

		await act(async () => {
			result.current.retry();
		});

		expect(vi.mocked(searchAddressForCheckout)).toHaveBeenLastCalledWith({
			text: "Lyon",
			country: "FR",
		});
	});

	it("retry() clears a previous error on success", async () => {
		vi.mocked(searchAddressForCheckout)
			.mockResolvedValueOnce(makeSearchResult([], true))
			.mockResolvedValueOnce(makeSearchResult(mockResults));

		const { result } = renderHook(() => useAddressAutocomplete("Paris", "FR"));

		await act(async () => {});
		expect(result.current.error).not.toBeNull();

		await act(async () => {
			result.current.retry();
		});

		expect(result.current.error).toBeNull();
		expect(result.current.suggestions).toEqual(mockResults);
	});

	// --------------------------------------------------------------------------
	// Short-query guard with existing results
	// --------------------------------------------------------------------------

	it("returns empty suggestions for short query even when previous results exist", async () => {
		vi.mocked(searchAddressForCheckout).mockResolvedValue(makeSearchResult(mockResults));

		const { result, rerender } = renderHook(
			({ query }: { query: string }) => useAddressAutocomplete(query, "FR"),
			{ initialProps: { query: "Rue de la Paix" } },
		);

		await act(async () => {});
		expect(result.current.suggestions).toEqual(mockResults);

		// Drop back to a short query — results state is still there but
		// suggestions should be gated to []
		rerender({ query: "R" });

		expect(result.current.suggestions).toEqual([]);
	});
});
