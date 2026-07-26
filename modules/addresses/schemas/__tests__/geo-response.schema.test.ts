import { describe, it, expect } from "vitest";

import { banResultSchema, geoapifyResultSchema, parseGeoResults } from "../geo-response.schema";

const VALID_BAN_STREET = {
	country: "StreetAddress",
	city: "Paris",
	x: 2.3488,
	y: 48.8534,
	zipcode: "75001",
	street: "Rue de Rivoli",
	classification: 7,
	kind: "street",
	fulltext: "Rue de Rivoli, 75001 Paris",
};

const VALID_BAN_POI = {
	country: "PositionOfInterest",
	names: ["Tour Eiffel"],
	zipcodes: ["75007"],
	city: "Paris",
	street: "Champ de Mars",
	poiType: ["monument"],
	kind: "poi",
	fulltext: "Tour Eiffel, Paris",
	classification: 5,
	x: 2.2945,
	y: 48.8584,
};

const VALID_GEOAPIFY = {
	formatted: "Grote Markt 1, 1000 Brussel, Belgium",
	address_line1: "Grote Markt 1",
	street: "Grote Markt",
	housenumber: "1",
	postcode: "1000",
	city: "Brussel",
	lat: 50.8467,
	lon: 4.3525,
	rank: { confidence: 0.95 },
	result_type: "building",
};

describe("parseGeoResults — BAN", () => {
	it("conserve tous les items valides (StreetAddress + PositionOfInterest)", () => {
		const results = parseGeoResults(
			{ status: "OK", results: [VALID_BAN_STREET, VALID_BAN_POI] },
			banResultSchema,
		);
		expect(results).toHaveLength(2);
		expect(results[0]?.country).toBe("StreetAddress");
		expect(results[1]?.country).toBe("PositionOfInterest");
	});

	it("filtre un item corrompu sans throw, les autres passent", () => {
		const corrupted = { ...VALID_BAN_STREET, x: "not-a-number" };
		const results = parseGeoResults({ results: [corrupted, VALID_BAN_POI] }, banResultSchema);
		expect(results).toHaveLength(1);
		expect(results[0]?.fulltext).toBe("Tour Eiffel, Paris");
	});

	it("laisse passer les champs fournisseur non consommés (looseObject)", () => {
		const withExtra = { ...VALID_BAN_STREET, oldcity: "Lutèce", metropole: true };
		const results = parseGeoResults({ results: [withExtra] }, banResultSchema);
		expect(results).toHaveLength(1);
		expect(results[0]?.["oldcity"]).toBe("Lutèce");
	});

	it("rejette un item sans discriminant country", () => {
		const { country: _c, ...noCountry } = VALID_BAN_STREET;
		const results = parseGeoResults({ results: [noCountry] }, banResultSchema);
		expect(results).toHaveLength(0);
	});

	it("retourne [] si results est absent", () => {
		expect(parseGeoResults({ status: "OK" }, banResultSchema)).toEqual([]);
	});

	it("retourne [] si l'enveloppe n'est pas un objet", () => {
		expect(parseGeoResults(null, banResultSchema)).toEqual([]);
		expect(parseGeoResults("garbage", banResultSchema)).toEqual([]);
		expect(parseGeoResults(42, banResultSchema)).toEqual([]);
	});

	it("retourne [] si results n'est pas un tableau", () => {
		expect(parseGeoResults({ results: "oops" }, banResultSchema)).toEqual([]);
	});
});

describe("parseGeoResults — Geoapify", () => {
	it("conserve un item valide complet", () => {
		const results = parseGeoResults({ results: [VALID_GEOAPIFY] }, geoapifyResultSchema);
		expect(results).toHaveLength(1);
		expect(results[0]?.lat).toBe(50.8467);
	});

	it("accepte un item minimal (formatted + lat + lon seulement)", () => {
		const minimal = { formatted: "Somewhere", lat: 1, lon: 2 };
		const results = parseGeoResults({ results: [minimal] }, geoapifyResultSchema);
		expect(results).toHaveLength(1);
	});

	it("filtre un item sans coordonnées, les autres passent", () => {
		const { lat: _lat, ...noLat } = VALID_GEOAPIFY;
		const results = parseGeoResults({ results: [noLat, VALID_GEOAPIFY] }, geoapifyResultSchema);
		expect(results).toHaveLength(1);
	});

	it("filtre un item dont formatted n'est pas une string", () => {
		const results = parseGeoResults(
			{ results: [{ ...VALID_GEOAPIFY, formatted: 123 }] },
			geoapifyResultSchema,
		);
		expect(results).toHaveLength(0);
	});
});
