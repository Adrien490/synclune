import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockBuildApiUrl, mockTransformCompletionResult, mockCacheAddressSearch, mockFetch } =
	vi.hoisted(() => ({
		mockBuildApiUrl: vi.fn(),
		mockTransformCompletionResult: vi.fn(),
		mockCacheAddressSearch: vi.fn(),
		mockFetch: vi.fn(),
	}));

vi.mock("@/modules/addresses/constants/cache", () => ({
	cacheAddressSearch: mockCacheAddressSearch,
}));

vi.mock("@/modules/addresses/services/address-api.service", () => ({
	buildApiUrl: mockBuildApiUrl,
}));

vi.mock("@/modules/addresses/utils/address-transform.utils", () => ({
	transformCompletionResult: mockTransformCompletionResult,
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

// Polyfill global fetch
global.fetch = mockFetch;

import { fetchAddresses } from "../fetch-addresses";

// ============================================================================
// FACTORIES
// ============================================================================

function makeParams(overrides: Record<string, unknown> = {}) {
	return {
		text: "12 rue de la paix",
		type: "StreetAddress",
		maximumResponses: 5,
		...overrides,
	};
}

function makeRawResult() {
	return {
		country: "StreetAddress" as const,
		city: "Paris",
		x: 2.331,
		y: 48.869,
		zipcode: "75001",
		street: "Rue de la Paix",
		classification: 8,
		kind: "street",
		fulltext: "12 Rue de la Paix, 75001 Paris",
	};
}

function makeTransformedResult() {
	return {
		fulltext: "12 Rue de la Paix, 75001 Paris",
		street: "Rue de la Paix",
		zipcode: "75001",
		city: "Paris",
		coordinates: { longitude: 2.331, latitude: 48.869 },
		classification: 8,
		kind: "street",
		type: "StreetAddress" as const,
		label: "12 Rue de la Paix, 75001 Paris",
		postcode: "75001",
	};
}

function makeApiResponse(results = [makeRawResult()]) {
	return { status: "OK", results };
}

function makeOkResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		statusText: "OK",
		json: vi.fn().mockResolvedValue(body),
	};
}

function makeErrorResponse(status = 503, statusText = "Service Unavailable") {
	return {
		ok: false,
		status,
		statusText,
		json: vi.fn(),
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("fetchAddresses", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockBuildApiUrl.mockReturnValue("https://api.example.com/completion?text=paris");
		mockTransformCompletionResult.mockReturnValue(makeTransformedResult());
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse()));
	});

	it("calls buildApiUrl with the given params", async () => {
		const params = makeParams();

		await fetchAddresses(params);

		expect(mockBuildApiUrl).toHaveBeenCalledWith(params);
	});

	it("fetches from the URL returned by buildApiUrl", async () => {
		await fetchAddresses(makeParams());

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.example.com/completion?text=paris",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("sends Accept: application/json header", async () => {
		await fetchAddresses(makeParams());

		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: "application/json" }),
			}),
		);
	});

	it("transforms each result with transformCompletionResult", async () => {
		const rawResult = makeRawResult();
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse([rawResult])));

		await fetchAddresses(makeParams());

		// Array.map passes (item, index, array) — assert only on the first argument
		expect(mockTransformCompletionResult).toHaveBeenCalledWith(rawResult, 0, [rawResult]);
	});

	it("returns addresses array from transformed results", async () => {
		const transformed = makeTransformedResult();
		mockTransformCompletionResult.mockReturnValue(transformed);

		const result = await fetchAddresses(makeParams());

		expect(result.addresses).toHaveLength(1);
		expect(result.addresses[0]).toEqual(transformed);
	});

	it("returns the query from params.text", async () => {
		const params = makeParams({ text: "Lyon" });

		const result = await fetchAddresses(params);

		expect(result.query).toBe("Lyon");
	});

	it("returns the limit from params.maximumResponses", async () => {
		const params = makeParams({ maximumResponses: 8 });

		const result = await fetchAddresses(params);

		expect(result.limit).toBe(8);
	});

	it("throws an error when the API response is not ok", async () => {
		mockFetch.mockResolvedValue(makeErrorResponse(503, "Service Unavailable"));

		await expect(fetchAddresses(makeParams())).rejects.toThrow("Erreur API BAN: 503");
	});

	it("calls cacheAddressSearch with ban-FR- prefix and the text", async () => {
		const params = makeParams({ text: "bordeaux" });

		await fetchAddresses(params);

		expect(mockCacheAddressSearch).toHaveBeenCalledWith("ban-FR-bordeaux");
	});

	it("returns empty addresses array when API returns no results", async () => {
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse([])));

		const result = await fetchAddresses(makeParams());

		expect(result.addresses).toHaveLength(0);
	});
});
