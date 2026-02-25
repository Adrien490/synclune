import { describe, it, expect } from "vitest"
import { transformCompletionResult } from "../address-transform.utils"
import type {
	CompletionStreetAddress,
	CompletionPositionOfInterest,
} from "../../types/search-address.types"

const baseStreetAddress: CompletionStreetAddress = {
	country: "StreetAddress",
	city: "Paris",
	x: 2.3488,
	y: 48.8534,
	zipcode: "75001",
	street: "Rue de Rivoli",
	classification: 7,
	kind: "street",
	fulltext: "Rue de Rivoli, 75001 Paris",
}

const basePOI: CompletionPositionOfInterest = {
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
}

describe("transformCompletionResult", () => {
	it("should map StreetAddress fields correctly", () => {
		const result = transformCompletionResult(baseStreetAddress)
		expect(result.fulltext).toBe("Rue de Rivoli, 75001 Paris")
		expect(result.street).toBe("Rue de Rivoli")
		expect(result.zipcode).toBe("75001")
		expect(result.city).toBe("Paris")
		expect(result.classification).toBe(7)
		expect(result.kind).toBe("street")
		expect(result.type).toBe("StreetAddress")
	})

	it("should set coordinates from x and y", () => {
		const result = transformCompletionResult(baseStreetAddress)
		expect(result.coordinates.longitude).toBe(2.3488)
		expect(result.coordinates.latitude).toBe(48.8534)
	})

	it("should set label as alias for fulltext", () => {
		const result = transformCompletionResult(baseStreetAddress)
		expect(result.label).toBe(result.fulltext)
	})

	it("should set postcode as alias for zipcode", () => {
		const result = transformCompletionResult(baseStreetAddress)
		expect(result.postcode).toBe(result.zipcode)
	})

	it("should always set housenumber to undefined", () => {
		const result = transformCompletionResult(baseStreetAddress)
		expect(result.housenumber).toBeUndefined()
	})

	it("should use zipcodes[0] for PositionOfInterest without zipcode", () => {
		const result = transformCompletionResult(basePOI)
		expect(result.zipcode).toBe("75007")
		expect(result.type).toBe("PositionOfInterest")
	})

	it("should use direct zipcode for PositionOfInterest that has one", () => {
		const poiWithZipcode: CompletionPositionOfInterest = {
			...basePOI,
			zipcode: "75007",
		}
		const result = transformCompletionResult(poiWithZipcode)
		expect(result.zipcode).toBe("75007")
	})

	it("should default to empty string for StreetAddress with no zipcode", () => {
		// This case shouldn't happen in practice, but tests the fallback
		const addressWithoutZip = {
			...baseStreetAddress,
			zipcode: "" as string,
		}
		const result = transformCompletionResult(addressWithoutZip)
		expect(result.zipcode).toBe("")
	})
})
