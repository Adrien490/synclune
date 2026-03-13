import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockEnforceRateLimitForCurrentUser, mockFetchAddresses, mockFetchGeoapifyAddresses } =
	vi.hoisted(() => ({
		mockEnforceRateLimitForCurrentUser: vi.fn(),
		mockFetchAddresses: vi.fn(),
		mockFetchGeoapifyAddresses: vi.fn(),
	}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimitForCurrentUser,
}));

vi.mock("@/modules/addresses/data/fetch-addresses", () => ({
	fetchAddresses: mockFetchAddresses,
}));

vi.mock("@/modules/addresses/data/fetch-geoapify-addresses", () => ({
	fetchGeoapifyAddresses: mockFetchGeoapifyAddresses,
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
	geoapifySearchSchema: {
		parse: (params: Record<string, unknown>) => ({
			text: params.text ?? "",
			countryCode: ((params.countryCode as string) || "").toUpperCase(),
			...params,
		}),
	},
}));

import { searchAddressForCheckout } from "../search-address";

// ============================================================================
// Factories
// ============================================================================

function makeSearchResult(overrides: Record<string, unknown> = {}) {
	return {
		addresses: [{ label: "Test Address", x: 2.0, y: 48.0 }],
		query: "test",
		limit: 5,
		...overrides,
	};
}

function setupDefaults() {
	mockEnforceRateLimitForCurrentUser.mockResolvedValue({ success: true });
	mockFetchAddresses.mockResolvedValue(makeSearchResult({ query: "12 rue de la paix" }));
	mockFetchGeoapifyAddresses.mockResolvedValue(makeSearchResult({ query: "Kurfurstendamm 21" }));
}

// ============================================================================
// Tests: searchAddressForCheckout
// ============================================================================

describe("searchAddressForCheckout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("routes FR to BAN API (fetchAddresses)", async () => {
		await searchAddressForCheckout({ text: "12 rue de la paix", country: "FR" });

		expect(mockFetchAddresses).toHaveBeenCalled();
		expect(mockFetchGeoapifyAddresses).not.toHaveBeenCalled();
	});

	it("routes non-FR to Geoapify API", async () => {
		await searchAddressForCheckout({ text: "Kurfurstendamm", country: "DE" });

		expect(mockFetchGeoapifyAddresses).toHaveBeenCalled();
		expect(mockFetchAddresses).not.toHaveBeenCalled();
	});

	it("passes country code to Geoapify params", async () => {
		await searchAddressForCheckout({ text: "Grand Place", country: "BE" });

		expect(mockFetchGeoapifyAddresses).toHaveBeenCalledWith(
			expect.objectContaining({ countryCode: "BE" }),
		);
	});

	it("passes maximumResponses=5 for FR requests", async () => {
		await searchAddressForCheckout({ text: "Paris", country: "FR" });

		expect(mockFetchAddresses).toHaveBeenCalledWith(
			expect.objectContaining({ maximumResponses: 5 }),
		);
	});

	it("returns empty result when rate limited", async () => {
		mockEnforceRateLimitForCurrentUser.mockResolvedValue({
			error: { status: "error", message: "Rate limited" },
		});

		const result = await searchAddressForCheckout({ text: "test", country: "FR" });

		expect(result.addresses).toEqual([]);
		expect(mockFetchAddresses).not.toHaveBeenCalled();
		expect(mockFetchGeoapifyAddresses).not.toHaveBeenCalled();
	});

	it("returns error result when FR API fails", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("API BAN down"));

		const result = await searchAddressForCheckout({ text: "Paris", country: "FR" });

		expect(result.addresses).toEqual([]);
		expect(result.error).toBe(true);
	});

	it("returns error result when Geoapify API fails", async () => {
		mockFetchGeoapifyAddresses.mockRejectedValue(new Error("Geoapify timeout"));

		const result = await searchAddressForCheckout({ text: "Berlin", country: "DE" });

		expect(result.addresses).toEqual([]);
		expect(result.error).toBe(true);
	});

	it("does not throw when API fails", async () => {
		mockFetchAddresses.mockRejectedValue(new Error("Network error"));

		await expect(searchAddressForCheckout({ text: "test", country: "FR" })).resolves.not.toThrow();
	});
});
