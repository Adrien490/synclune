import { describe, it, expect } from "vitest";
import { buildApiUrl } from "../address-api.service";

const BASE_URL = "https://data.geopf.fr/geocodage/completion";

describe("buildApiUrl", () => {
	it("should build URL with only required text parameter", () => {
		const url = buildApiUrl({ text: "Paris", type: "PositionOfInterest,StreetAddress", maximumResponses: 10 });
		const parsed = new URL(url);

		expect(parsed.origin + parsed.pathname).toBe(BASE_URL);
		expect(parsed.searchParams.get("text")).toBe("Paris");
	});

	it("should not include optional parameters when not provided", () => {
		const url = buildApiUrl({ text: "Lyon", type: "PositionOfInterest,StreetAddress", maximumResponses: 10 });
		const parsed = new URL(url);

		expect(parsed.searchParams.has("terr")).toBe(false);
		expect(parsed.searchParams.has("poiType")).toBe(false);
		expect(parsed.searchParams.has("lonlat")).toBe(false);
		expect(parsed.searchParams.has("bbox")).toBe(false);
	});

	it("should include terr parameter when provided", () => {
		const url = buildApiUrl({
			text: "Bordeaux",
			terr: "METROPOLE",
			type: "PositionOfInterest,StreetAddress",
			maximumResponses: 10,
		});
		const parsed = new URL(url);

		expect(parsed.searchParams.get("terr")).toBe("METROPOLE");
	});

	it("should include all optional parameters when provided", () => {
		const url = buildApiUrl({
			text: "Tour Eiffel",
			terr: "METROPOLE",
			poiType: "Tourisme",
			lonlat: "2.37,48.357",
			type: "PositionOfInterest",
			maximumResponses: 5,
			bbox: "-1.54,43.17,5.89,51.12",
		});
		const parsed = new URL(url);

		expect(parsed.searchParams.get("text")).toBe("Tour Eiffel");
		expect(parsed.searchParams.get("terr")).toBe("METROPOLE");
		expect(parsed.searchParams.get("poiType")).toBe("Tourisme");
		expect(parsed.searchParams.get("lonlat")).toBe("2.37,48.357");
		expect(parsed.searchParams.get("type")).toBe("PositionOfInterest");
		expect(parsed.searchParams.get("maximumResponses")).toBe("5");
		expect(parsed.searchParams.get("bbox")).toBe("-1.54,43.17,5.89,51.12");
	});

	it("should encode special characters in text", () => {
		const url = buildApiUrl({
			text: "Rue de l'Église & Paix",
			type: "PositionOfInterest,StreetAddress",
			maximumResponses: 10,
		});
		const parsed = new URL(url);

		// URL parsing decodes the value automatically
		expect(parsed.searchParams.get("text")).toBe("Rue de l'Église & Paix");
		// The raw URL string should contain percent-encoded chars
		expect(url).toContain("text=");
	});

	it("should include maximumResponses as string in the URL", () => {
		const url = buildApiUrl({
			text: "Nantes",
			type: "StreetAddress",
			maximumResponses: 15,
		});
		const parsed = new URL(url);

		expect(parsed.searchParams.get("maximumResponses")).toBe("15");
	});

	it("should use the correct base URL", () => {
		const url = buildApiUrl({ text: "test", type: "PositionOfInterest,StreetAddress", maximumResponses: 10 });

		expect(url.startsWith(BASE_URL)).toBe(true);
	});

	it("should include poiType when provided without terr", () => {
		const url = buildApiUrl({
			text: "hotel",
			poiType: "Hébergement",
			type: "PositionOfInterest",
			maximumResponses: 10,
		});
		const parsed = new URL(url);

		expect(parsed.searchParams.get("poiType")).toBe("Hébergement");
		expect(parsed.searchParams.has("terr")).toBe(false);
	});

	it("should include lonlat when provided for proximity search", () => {
		const url = buildApiUrl({
			text: "boulangerie",
			lonlat: "2.3522,48.8566",
			type: "PositionOfInterest,StreetAddress",
			maximumResponses: 10,
		});
		const parsed = new URL(url);

		expect(parsed.searchParams.get("lonlat")).toBe("2.3522,48.8566");
	});
});
