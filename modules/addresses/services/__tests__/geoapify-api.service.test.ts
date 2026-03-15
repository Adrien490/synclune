import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildGeoapifyUrl } from "../geoapify-api.service";

const BASE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

describe("buildGeoapifyUrl", () => {
	beforeEach(() => {
		vi.stubEnv("GEOAPIFY_API_KEY", "test-api-key");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("should build URL with required params", () => {
		const url = buildGeoapifyUrl({ text: "Paris", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("text")).toBe("Paris");
		expect(parsed.searchParams.get("filter")).toBe("countrycode:fr");
	});

	it("should use the correct base URL", () => {
		const url = buildGeoapifyUrl({ text: "Lyon", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.origin + parsed.pathname).toBe(BASE_URL);
	});

	it("should lowercase the country code in the filter param", () => {
		const url = buildGeoapifyUrl({ text: "Berlin", countryCode: "DE" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("filter")).toBe("countrycode:de");
	});

	it("should set lang to fr", () => {
		const url = buildGeoapifyUrl({ text: "Marseille", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("lang")).toBe("fr");
	});

	it("should set format to json by default", () => {
		const url = buildGeoapifyUrl({ text: "Bordeaux", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("format")).toBe("json");
	});

	it("should use default limit of 5 when limit is not provided", () => {
		const url = buildGeoapifyUrl({ text: "Nantes", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("limit")).toBe("5");
	});

	it("should use custom limit when provided", () => {
		const url = buildGeoapifyUrl({ text: "Toulouse", countryCode: "FR", limit: 10 });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("limit")).toBe("10");
	});

	it("should include the API key from env", () => {
		const url = buildGeoapifyUrl({ text: "Lille", countryCode: "FR" });
		const parsed = new URL(url);

		expect(parsed.searchParams.get("apiKey")).toBe("test-api-key");
	});

	it("should throw when GEOAPIFY_API_KEY is not set", () => {
		vi.unstubAllEnvs();

		expect(() => buildGeoapifyUrl({ text: "Nice", countryCode: "FR" })).toThrow(
			"GEOAPIFY_API_KEY is not configured",
		);
	});

	it("should encode special characters in text", () => {
		const url = buildGeoapifyUrl({ text: "Rue de l'Église & Paix", countryCode: "FR" });
		const parsed = new URL(url);

		// URL parsing decodes the value automatically
		expect(parsed.searchParams.get("text")).toBe("Rue de l'Église & Paix");
		// The raw URL string should contain percent-encoded chars
		expect(url).toContain("text=");
	});

	it("should not include undefined optional params", () => {
		const url = buildGeoapifyUrl({ text: "Strasbourg", countryCode: "FR" });
		const parsed = new URL(url);

		// Only the explicitly set params should be present
		const expectedKeys = ["text", "filter", "lang", "format", "limit", "apiKey"];
		const actualKeys = Array.from(parsed.searchParams.keys());

		expect(actualKeys).toHaveLength(expectedKeys.length);
		expect(actualKeys.sort()).toEqual(expectedKeys.sort());
	});
});
