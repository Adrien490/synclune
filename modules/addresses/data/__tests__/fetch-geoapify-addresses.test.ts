import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockBuildGeoapifyUrl, mockTransformGeoapifyResult, mockCacheAddressSearch, mockFetch } =
	vi.hoisted(() => ({
		mockBuildGeoapifyUrl: vi.fn(),
		mockTransformGeoapifyResult: vi.fn(),
		mockCacheAddressSearch: vi.fn(),
		mockFetch: vi.fn(),
	}));

vi.mock("@/modules/addresses/constants/cache", () => ({
	cacheAddressSearch: mockCacheAddressSearch,
}));

vi.mock("@/modules/addresses/services/geoapify-api.service", () => ({
	buildGeoapifyUrl: mockBuildGeoapifyUrl,
}));

vi.mock("@/modules/addresses/utils/geoapify-transform.utils", () => ({
	transformGeoapifyResult: mockTransformGeoapifyResult,
}));

vi.mock("@/modules/addresses/constants/geoapify.constants", () => ({
	GEOAPIFY_DEFAULT_LIMIT: 5,
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

// Polyfill global fetch
global.fetch = mockFetch;

import { fetchGeoapifyAddresses } from "../fetch-geoapify-addresses";

// ============================================================================
// FACTORIES
// ============================================================================

function makeParams(overrides: Record<string, unknown> = {}) {
	return {
		text: "rue de la paix",
		countryCode: "BE",
		...overrides,
	};
}

function makeRawGeoapifyResult() {
	return {
		formatted: "Rue de la Paix 12, 1000 Bruxelles",
		address_line1: "Rue de la Paix 12",
		street: "Rue de la Paix",
		housenumber: "12",
		postcode: "1000",
		city: "Bruxelles",
		lat: 50.846,
		lon: 4.352,
	};
}

function makeTransformedResult() {
	return {
		fulltext: "Rue de la Paix 12",
		street: "Rue de la Paix",
		zipcode: "1000",
		city: "Bruxelles",
		coordinates: { longitude: 4.352, latitude: 50.846 },
		classification: 0,
		kind: "street",
		type: "StreetAddress" as const,
		label: "Rue de la Paix 12",
		postcode: "1000",
		housenumber: "12",
	};
}

function makeApiResponse(results = [makeRawGeoapifyResult()]) {
	return { results };
}

function makeOkResponse(body: unknown) {
	return {
		ok: true,
		status: 200,
		statusText: "OK",
		json: vi.fn().mockResolvedValue(body),
	};
}

function makeErrorResponse(status = 401, statusText = "Unauthorized") {
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

describe("fetchGeoapifyAddresses", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockBuildGeoapifyUrl.mockReturnValue(
			"https://api.geoapify.com/v1/geocode/autocomplete?text=rue",
		);
		mockTransformGeoapifyResult.mockReturnValue(makeTransformedResult());
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse()));
	});

	it("calls buildGeoapifyUrl with the given params", async () => {
		const params = makeParams();

		await fetchGeoapifyAddresses(params);

		expect(mockBuildGeoapifyUrl).toHaveBeenCalledWith(params);
	});

	it("fetches from the URL returned by buildGeoapifyUrl", async () => {
		await fetchGeoapifyAddresses(makeParams());

		expect(mockFetch).toHaveBeenCalledWith(
			"https://api.geoapify.com/v1/geocode/autocomplete?text=rue",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("sends Accept: application/json header", async () => {
		await fetchGeoapifyAddresses(makeParams());

		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: "application/json" }),
			}),
		);
	});

	it("transforms each result with transformGeoapifyResult", async () => {
		const rawResult = makeRawGeoapifyResult();
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse([rawResult])));

		await fetchGeoapifyAddresses(makeParams());

		// Array.map passes (item, index, array) — assert only on the first argument
		expect(mockTransformGeoapifyResult).toHaveBeenCalledWith(rawResult, 0, [rawResult]);
	});

	it("returns addresses array from transformed results", async () => {
		const transformed = makeTransformedResult();
		mockTransformGeoapifyResult.mockReturnValue(transformed);

		const result = await fetchGeoapifyAddresses(makeParams());

		expect(result.addresses).toHaveLength(1);
		expect(result.addresses[0]).toEqual(transformed);
	});

	it("returns the query from params.text", async () => {
		const params = makeParams({ text: "Grand Place Bruxelles" });

		const result = await fetchGeoapifyAddresses(params);

		expect(result.query).toBe("Grand Place Bruxelles");
	});

	it("returns the limit from params.limit when provided", async () => {
		const params = makeParams({ limit: 8 });

		const result = await fetchGeoapifyAddresses(params);

		expect(result.limit).toBe(8);
	});

	it("returns GEOAPIFY_DEFAULT_LIMIT (5) when limit is not provided", async () => {
		const params = makeParams(); // no limit

		const result = await fetchGeoapifyAddresses(params);

		expect(result.limit).toBe(5);
	});

	it("throws an error when the API response is not ok", async () => {
		mockFetch.mockResolvedValue(makeErrorResponse(401, "Unauthorized"));

		await expect(fetchGeoapifyAddresses(makeParams())).rejects.toThrow("Geoapify API error: 401");
	});

	it("calls cacheAddressSearch with geo-{countryCode}-{text} key", async () => {
		const params = makeParams({ text: "bruxelles", countryCode: "BE" });

		await fetchGeoapifyAddresses(params);

		expect(mockCacheAddressSearch).toHaveBeenCalledWith("geo-BE-bruxelles");
	});

	it("returns empty addresses array when API returns no results", async () => {
		mockFetch.mockResolvedValue(makeOkResponse(makeApiResponse([])));

		const result = await fetchGeoapifyAddresses(makeParams());

		expect(result.addresses).toHaveLength(0);
	});
});
