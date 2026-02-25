import { describe, it, expect } from "vitest"
import { parseFullName } from "../parse-full-name"

describe("parseFullName", () => {
	it("should split a two-word name into firstName and lastName", () => {
		expect(parseFullName("Jean Dupont")).toEqual({ firstName: "Jean", lastName: "Dupont" })
	})

	it("should treat a single word as firstName with empty lastName", () => {
		expect(parseFullName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" })
	})

	it("should handle three words: first two become firstName, last becomes lastName", () => {
		expect(parseFullName("Jean Pierre Dupont")).toEqual({ firstName: "Jean Pierre", lastName: "Dupont" })
	})

	it("should handle four words: everything except last becomes firstName", () => {
		expect(parseFullName("Marie Anne De La Croix")).toEqual({ firstName: "Marie Anne De La", lastName: "Croix" })
	})

	it("should trim leading and trailing spaces", () => {
		expect(parseFullName("  Jean Dupont  ")).toEqual({ firstName: "Jean", lastName: "Dupont" })
	})

	it("should return empty strings for an empty string", () => {
		expect(parseFullName("")).toEqual({ firstName: "", lastName: "" })
	})

	it("should return empty strings for a string of only spaces", () => {
		expect(parseFullName("   ")).toEqual({ firstName: "", lastName: "" })
	})

	it("should handle names with hyphens as a single token", () => {
		expect(parseFullName("Marie-Claire Dupont")).toEqual({ firstName: "Marie-Claire", lastName: "Dupont" })
	})
})
