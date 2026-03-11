import { describe, it, expect } from "vitest";
import { transformGeoapifyResult } from "../geoapify-transform.utils";

const baseResult = {
	formatted: "Kurfürstendamm 21, 10719 Berlin, Germany",
	address_line1: "Kurfürstendamm 21",
	street: "Kurfürstendamm",
	housenumber: "21",
	postcode: "10719",
	city: "Berlin",
	lat: 52.5024,
	lon: 13.3272,
	rank: { confidence: 0.9 },
	result_type: "building",
};

describe("transformGeoapifyResult", () => {
	it("should map all fields correctly", () => {
		const result = transformGeoapifyResult(baseResult);
		expect(result.fulltext).toBe("Kurfürstendamm 21");
		expect(result.label).toBe("Kurfürstendamm 21");
		expect(result.street).toBe("Kurfürstendamm");
		expect(result.housenumber).toBe("21");
		expect(result.zipcode).toBe("10719");
		expect(result.postcode).toBe("10719");
		expect(result.city).toBe("Berlin");
		expect(result.type).toBe("StreetAddress");
	});

	it("should set coordinates from lat and lon", () => {
		const result = transformGeoapifyResult(baseResult);
		expect(result.coordinates.longitude).toBe(13.3272);
		expect(result.coordinates.latitude).toBe(52.5024);
	});

	it("should use rank confidence as classification", () => {
		const result = transformGeoapifyResult(baseResult);
		expect(result.classification).toBe(0.9);
	});

	it("should use result_type as kind", () => {
		const result = transformGeoapifyResult(baseResult);
		expect(result.kind).toBe("building");
	});

	it("should fallback to formatted when address_line1 is missing", () => {
		const { address_line1: _, ...withoutLine1 } = baseResult;
		const result = transformGeoapifyResult(withoutLine1);
		expect(result.label).toBe("Kurfürstendamm 21, 10719 Berlin, Germany");
		expect(result.fulltext).toBe(result.label);
	});

	it("should default to empty string when postcode is missing", () => {
		const { postcode: _, ...withoutPostcode } = baseResult;
		const result = transformGeoapifyResult(withoutPostcode);
		expect(result.postcode).toBe("");
		expect(result.zipcode).toBe("");
	});

	it("should default to empty string when city is missing", () => {
		const { city: _, ...withoutCity } = baseResult;
		const result = transformGeoapifyResult(withoutCity);
		expect(result.city).toBe("");
	});

	it("should default to empty string when street is missing", () => {
		const { street: _, ...withoutStreet } = baseResult;
		const result = transformGeoapifyResult(withoutStreet);
		expect(result.street).toBe("");
	});

	it("should default housenumber to undefined when missing", () => {
		const { housenumber: _, ...withoutHousenumber } = baseResult;
		const result = transformGeoapifyResult(withoutHousenumber);
		expect(result.housenumber).toBeUndefined();
	});

	it("should default classification to 0 when rank is missing", () => {
		const { rank: _, ...withoutRank } = baseResult;
		const result = transformGeoapifyResult(withoutRank);
		expect(result.classification).toBe(0);
	});

	it("should default kind to 'street' when result_type is missing", () => {
		const { result_type: _, ...withoutType } = baseResult;
		const result = transformGeoapifyResult(withoutType);
		expect(result.kind).toBe("street");
	});
});
