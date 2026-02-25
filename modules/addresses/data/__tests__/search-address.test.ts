import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockEnforceRateLimitForCurrentUser,
	mockFetchAddresses,
} = vi.hoisted(() => ({
	mockEnforceRateLimitForCurrentUser: vi.fn(),
	mockFetchAddresses: vi.fn(),
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimitForCurrentUser,
}));

vi.mock("@/modules/addresses/data/fetch-addresses", () => ({
	fetchAddresses: mockFetchAddresses,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADDRESS_LIMITS: {
		SEARCH: { limit: 30, windowMs: 60000 },
	},
}));

vi.mock("../schemas/search-address.schema", () => ({
	searchAddressSchema: {
		parse: (params: Record<string, unknown>) => ({
			text: params.text ?? "",
			maximumResponses: params.maximumResponses ?? 10,
			type: params.type ?? "PositionOfInterest,StreetAddress",
			...params,
		}),
	},
}));

import { searchAddress } from "../search-address";

// ============================================================================
// Factories
// ============================================================================

function makeSearchParams(overrides: Record<string, unknown> = {}) {
	return {
		text: "12 rue de la paix Paris",
		maximumResponses: 5,
		...overrides,
	};
}

function makeSearchResult(overrides: Record<string, unknown> = {}) {
	return {
		addresses: [
			{
				label: "12 Rue de la Paix, 75001 Paris",
				x: 2.331,
				y: 48.869,
			},
		],
		query: "12 rue de la paix Paris",
		limit: 5,
		...overrides,
	};
}

function makeRateLimitError() {
	return {
		error: {
			status: "error" as const,
			message: "Trop de requetes. Veuillez reessayer plus tard.",
			data: { retryAfter: 60000 },
		},
	};
}

function setupDefaults() {
	mockEnforceRateLimitForCurrentUser.mockResolvedValue({ success: true });
	mockFetchAddresses.mockResolvedValue(makeSearchResult());
}

// ============================================================================
// Tests: searchAddress
// ============================================================================

describe("searchAddress", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns addresses on successful search", async () => {
		const params = makeSearchParams();
		const expected = makeSearchResult();
		mockFetchAddresses.mockResolvedValue(expected);

		const result = await searchAddress(params);

		expect(result).toEqual(expected);
	});

	it("calls enforceRateLimitForCurrentUser with ADDRESS_LIMITS.SEARCH", async () => {
		await searchAddress(makeSearchParams());

		expect(mockEnforceRateLimitForCurrentUser).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 30, windowMs: 60000 })
		);
	});

	it("returns empty result when rate limit is exceeded", async () => {
		mockEnforceRateLimitForCurrentUser.mockResolvedValue(makeRateLimitError());
		const params = makeSearchParams({ text: "Lyon", maximumResponses: 5 });

		const result = await searchAddress(params);

		expect(result).toEqual({ addresses: [], query: "Lyon", limit: 5 });
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});

	it("does not call fetchAddresses when rate limited", async () => {
		mockEnforceRateLimitForCurrentUser.mockResolvedValue(makeRateLimitError());

		await searchAddress(makeSearchParams());

		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});

	it("calls fetchAddresses with validated params after rate limit passes", async () => {
		const params = makeSearchParams({ text: "Bordeaux", maximumResponses: 8 });

		await searchAddress(params);

		expect(mockFetchAddresses).toHaveBeenCalledWith(
			expect.objectContaining({ text: "Bordeaux", maximumResponses: 8 })
		);
	});

	it("returns error result when fetchAddresses throws", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("API BAN: 503 Service Unavailable"));
		const params = makeSearchParams({ text: "Marseille", maximumResponses: 10 });

		const result = await searchAddress(params);

		expect(result).toMatchObject({
			addresses: [],
			query: "Marseille",
			limit: 10,
			error: true,
		});
	});

	it("does not propagate the error thrown by fetchAddresses", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("Network error"));

		await expect(searchAddress(makeSearchParams())).resolves.not.toThrow();
	});

	it("preserves query and limit in error response", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("Timeout"));
		const params = makeSearchParams({ text: "Toulouse", maximumResponses: 7 });

		const result = await searchAddress(params);

		expect(result.query).toBe("Toulouse");
		expect(result.limit).toBe(7);
		expect(result.addresses).toEqual([]);
	});

	it("returns empty address array in error response (not undefined)", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("Unknown"));

		const result = await searchAddress(makeSearchParams());

		expect(Array.isArray(result.addresses)).toBe(true);
		expect(result.addresses).toHaveLength(0);
	});

	it("passes validated params (with defaults applied) to fetchAddresses", async () => {
		const params = makeSearchParams({ text: "Nice" });

		await searchAddress(params);

		expect(mockFetchAddresses).toHaveBeenCalledWith(
			expect.objectContaining({
				text: "Nice",
				type: "PositionOfInterest,StreetAddress",
			})
		);
	});
});
