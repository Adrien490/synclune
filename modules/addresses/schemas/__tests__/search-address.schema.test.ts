import { describe, it, expect } from "vitest";
import {
	searchAddressSchema,
	geoapifySearchSchema,
} from "@/modules/addresses/schemas/search-address.schema";
import {
	SEARCH_ADDRESS_DEFAULT_LIMIT,
	SEARCH_ADDRESS_DEFAULT_TYPE,
	SEARCH_ADDRESS_MAX_LIMIT,
} from "@/modules/addresses/constants/ban-api.constants";

// ============================================================================
// searchAddressSchema
// ============================================================================

describe("searchAddressSchema", () => {
	// Valid data

	it("should accept a minimal valid object with only text", () => {
		const result = searchAddressSchema.safeParse({ text: "Paris" });
		expect(result.success).toBe(true);
	});

	it("should apply default type and maximumResponses when omitted", () => {
		const result = searchAddressSchema.safeParse({ text: "Lyon" });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe(SEARCH_ADDRESS_DEFAULT_TYPE);
			expect(result.data.maximumResponses).toBe(SEARCH_ADDRESS_DEFAULT_LIMIT);
		}
	});

	it("should accept a valid lonlat coordinate string", () => {
		const result = searchAddressSchema.safeParse({ text: "test", lonlat: "2.37,48.357" });
		expect(result.success).toBe(true);
	});

	it("should accept negative lonlat coordinates", () => {
		const result = searchAddressSchema.safeParse({ text: "test", lonlat: "-1.54,43.17" });
		expect(result.success).toBe(true);
	});

	it("should accept type PositionOfInterest", () => {
		const result = searchAddressSchema.safeParse({ text: "test", type: "PositionOfInterest" });
		expect(result.success).toBe(true);
	});

	it("should accept type StreetAddress", () => {
		const result = searchAddressSchema.safeParse({ text: "test", type: "StreetAddress" });
		expect(result.success).toBe(true);
	});

	it("should accept combined type PositionOfInterest,StreetAddress", () => {
		const result = searchAddressSchema.safeParse({
			text: "test",
			type: "PositionOfInterest,StreetAddress",
		});
		expect(result.success).toBe(true);
	});

	it("should accept maximumResponses at min boundary (1)", () => {
		const result = searchAddressSchema.safeParse({ text: "test", maximumResponses: 1 });
		expect(result.success).toBe(true);
	});

	it("should accept maximumResponses at max boundary", () => {
		const result = searchAddressSchema.safeParse({
			text: "test",
			maximumResponses: SEARCH_ADDRESS_MAX_LIMIT,
		});
		expect(result.success).toBe(true);
	});

	it("should coerce maximumResponses from a string number", () => {
		const result = searchAddressSchema.safeParse({ text: "test", maximumResponses: "5" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.maximumResponses).toBe(5);
	});

	it("should accept a valid bbox string", () => {
		const result = searchAddressSchema.safeParse({
			text: "test",
			bbox: "-1.54,43.17,5.89,51.12",
		});
		expect(result.success).toBe(true);
	});

	// Invalid data

	it("should reject an empty text string", () => {
		const result = searchAddressSchema.safeParse({ text: "" });
		expect(result.success).toBe(false);
	});

	it("should reject text exceeding 200 characters", () => {
		const result = searchAddressSchema.safeParse({ text: "a".repeat(201) });
		expect(result.success).toBe(false);
	});

	it("should reject an invalid lonlat format (missing lat)", () => {
		const result = searchAddressSchema.safeParse({ text: "test", lonlat: "2.37" });
		expect(result.success).toBe(false);
	});

	it("should reject an invalid type value", () => {
		const result = searchAddressSchema.safeParse({ text: "test", type: "InvalidType" });
		expect(result.success).toBe(false);
	});

	it("should reject maximumResponses above max", () => {
		const result = searchAddressSchema.safeParse({
			text: "test",
			maximumResponses: SEARCH_ADDRESS_MAX_LIMIT + 1,
		});
		expect(result.success).toBe(false);
	});

	it("should reject maximumResponses below 1", () => {
		const result = searchAddressSchema.safeParse({ text: "test", maximumResponses: 0 });
		expect(result.success).toBe(false);
	});

	it("should reject an invalid bbox format", () => {
		const result = searchAddressSchema.safeParse({ text: "test", bbox: "1.0,2.0,3.0" });
		expect(result.success).toBe(false);
	});

	it("should reject terr exceeding 10 characters", () => {
		const result = searchAddressSchema.safeParse({ text: "test", terr: "a".repeat(11) });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// geoapifySearchSchema
// ============================================================================

describe("geoapifySearchSchema", () => {
	it("should accept a valid minimal object", () => {
		const result = geoapifySearchSchema.safeParse({ text: "Brussels", countryCode: "be" });
		expect(result.success).toBe(true);
	});

	it("should uppercase the countryCode", () => {
		const result = geoapifySearchSchema.safeParse({ text: "Berlin", countryCode: "de" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.countryCode).toBe("DE");
	});

	it("should accept an optional limit within bounds", () => {
		const result = geoapifySearchSchema.safeParse({
			text: "Rome",
			countryCode: "IT",
			limit: 10,
		});
		expect(result.success).toBe(true);
	});

	it("should reject an empty text string", () => {
		const result = geoapifySearchSchema.safeParse({ text: "", countryCode: "FR" });
		expect(result.success).toBe(false);
	});

	it("should reject a countryCode that is not 2 characters", () => {
		const result = geoapifySearchSchema.safeParse({ text: "Paris", countryCode: "FRA" });
		expect(result.success).toBe(false);
	});

	it("should reject a limit exceeding 20", () => {
		const result = geoapifySearchSchema.safeParse({
			text: "test",
			countryCode: "FR",
			limit: 21,
		});
		expect(result.success).toBe(false);
	});

	it("should reject a limit below 1", () => {
		const result = geoapifySearchSchema.safeParse({ text: "test", countryCode: "FR", limit: 0 });
		expect(result.success).toBe(false);
	});
});
