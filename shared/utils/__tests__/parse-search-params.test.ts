import { describe, it, expect } from "vitest"
import { z } from "zod"
import { parseSearchParam, searchParamParsers, getFirstParam } from "../parse-search-params"
import { CUID_LENGTH } from "@/shared/constants/pagination"

const VALID_CURSOR = "a".repeat(CUID_LENGTH)

describe("getFirstParam", () => {
	it("should return the string as-is when given a string", () => {
		expect(getFirstParam("hello")).toBe("hello")
	})

	it("should return the first element when given an array", () => {
		expect(getFirstParam(["first", "second"])).toBe("first")
	})

	it("should return undefined when given undefined", () => {
		expect(getFirstParam(undefined)).toBeUndefined()
	})

	it("should return the only element of a single-element array", () => {
		expect(getFirstParam(["only"])).toBe("only")
	})
})

describe("parseSearchParam", () => {
	it("should return parsed value when valid", () => {
		const result = parseSearchParam("hello", z.string().min(1), "default")
		expect(result).toBe("hello")
	})

	it("should return defaultValue when value is undefined", () => {
		const result = parseSearchParam(undefined, z.string(), "fallback")
		expect(result).toBe("fallback")
	})

	it("should return defaultValue when validation fails", () => {
		const result = parseSearchParam("abc", z.string().email(), "fallback@example.com")
		expect(result).toBe("fallback@example.com")
	})

	it("should use the first element of an array", () => {
		const result = parseSearchParam(["first", "second"], z.string().min(1), "default")
		expect(result).toBe("first")
	})

	it("should return defaultValue when array is empty (empty string first element)", () => {
		const result = parseSearchParam("", z.string().min(1), "fallback")
		expect(result).toBe("fallback")
	})
})

describe("searchParamParsers.cursor", () => {
	it("should return a valid 25-character cursor", () => {
		const result = searchParamParsers.cursor(VALID_CURSOR)
		expect(result).toBe(VALID_CURSOR)
	})

	it("should return undefined for an invalid cursor", () => {
		const result = searchParamParsers.cursor("short")
		expect(result).toBeUndefined()
	})

	it("should return undefined when undefined", () => {
		const result = searchParamParsers.cursor(undefined)
		expect(result).toBeUndefined()
	})

	it("should use first element of array", () => {
		const result = searchParamParsers.cursor([VALID_CURSOR, "other"])
		expect(result).toBe(VALID_CURSOR)
	})
})

describe("searchParamParsers.direction", () => {
	it("should return 'forward' for valid input", () => {
		expect(searchParamParsers.direction("forward")).toBe("forward")
	})

	it("should return 'backward' for valid input", () => {
		expect(searchParamParsers.direction("backward")).toBe("backward")
	})

	it("should return 'forward' (default) when undefined", () => {
		expect(searchParamParsers.direction(undefined)).toBe("forward")
	})

	it("should return 'forward' (default) for invalid input", () => {
		expect(searchParamParsers.direction("sideways")).toBe("forward")
	})
})

describe("searchParamParsers.perPage", () => {
	it("should parse a valid perPage number", () => {
		expect(searchParamParsers.perPage("20")).toBe(20)
	})

	it("should return the default when undefined", () => {
		expect(searchParamParsers.perPage(undefined)).toBe(10)
	})

	it("should use a custom default value", () => {
		expect(searchParamParsers.perPage(undefined, 25)).toBe(25)
	})

	it("should return default when value exceeds max", () => {
		expect(searchParamParsers.perPage("999", 10, 100)).toBe(10)
	})

	it("should return default when value is below 1", () => {
		expect(searchParamParsers.perPage("0")).toBe(10)
	})

	it("should return default for non-numeric input", () => {
		expect(searchParamParsers.perPage("abc")).toBe(10)
	})

	it("should accept the max value exactly", () => {
		expect(searchParamParsers.perPage("100", 10, 100)).toBe(100)
	})
})

describe("searchParamParsers.search", () => {
	it("should return the search query when valid", () => {
		expect(searchParamParsers.search("necklace")).toBe("necklace")
	})

	it("should return undefined when undefined", () => {
		expect(searchParamParsers.search(undefined)).toBeUndefined()
	})

	it("should return undefined when string exceeds max length", () => {
		const tooLong = "a".repeat(201)
		expect(searchParamParsers.search(tooLong)).toBeUndefined()
	})

	it("should accept a custom max length", () => {
		const result = searchParamParsers.search("hello", 10)
		expect(result).toBe("hello")
	})

	it("should return undefined when string exceeds custom max length", () => {
		const result = searchParamParsers.search("hello world", 5)
		expect(result).toBeUndefined()
	})
})

describe("searchParamParsers.enum", () => {
	const validValues = ["asc", "desc"] as const

	it("should return the value when it is in the enum", () => {
		expect(searchParamParsers.enum("asc", validValues, "asc")).toBe("asc")
	})

	it("should return the default when undefined", () => {
		expect(searchParamParsers.enum(undefined, validValues, "asc")).toBe("asc")
	})

	it("should return the default when value is not in the enum", () => {
		expect(searchParamParsers.enum("invalid", validValues, "asc")).toBe("asc")
	})

	it("should use first element of array", () => {
		expect(searchParamParsers.enum(["desc", "asc"], validValues, "asc")).toBe("desc")
	})
})

describe("searchParamParsers.sortBy", () => {
	const validFields = ["createdAt", "updatedAt", "name"] as const

	it("should return the valid sortBy field", () => {
		expect(searchParamParsers.sortBy("name", validFields, "createdAt")).toBe("name")
	})

	it("should return the default for an invalid field", () => {
		expect(searchParamParsers.sortBy("unknownField", validFields, "createdAt")).toBe("createdAt")
	})

	it("should return the default when undefined", () => {
		expect(searchParamParsers.sortBy(undefined, validFields, "createdAt")).toBe("createdAt")
	})
})

describe("searchParamParsers.boolean", () => {
	it("should return true for 'true'", () => {
		expect(searchParamParsers.boolean("true")).toBe(true)
	})

	it("should return true for '1'", () => {
		expect(searchParamParsers.boolean("1")).toBe(true)
	})

	it("should return false for 'false'", () => {
		expect(searchParamParsers.boolean("false")).toBe(false)
	})

	it("should return false for '0'", () => {
		expect(searchParamParsers.boolean("0")).toBe(false)
	})

	it("should return the default when undefined", () => {
		expect(searchParamParsers.boolean(undefined)).toBe(false)
	})

	it("should use a custom default value", () => {
		expect(searchParamParsers.boolean(undefined, true)).toBe(true)
	})
})

describe("searchParamParsers.stringArray", () => {
	it("should return an array from a single string value", () => {
		expect(searchParamParsers.stringArray("one")).toEqual(["one"])
	})

	it("should return the array as-is when given an array", () => {
		expect(searchParamParsers.stringArray(["a", "b", "c"])).toEqual(["a", "b", "c"])
	})

	it("should return an empty array when undefined", () => {
		expect(searchParamParsers.stringArray(undefined)).toEqual([])
	})

	it("should filter out values failing the schema", () => {
		const strictSchema = z.string().max(3)
		const result = searchParamParsers.stringArray(["ok", "toolong", "yes"], strictSchema)
		expect(result).toEqual(["ok", "yes"])
	})

	it("should return all values when no schema is provided", () => {
		expect(searchParamParsers.stringArray(["x", "y"])).toEqual(["x", "y"])
	})
})

describe("searchParamParsers.date", () => {
	it("should parse a valid ISO datetime string into a Date", () => {
		const result = searchParamParsers.date("2024-06-15T10:00:00.000Z")
		expect(result).toBeInstanceOf(Date)
		expect(result?.toISOString()).toBe("2024-06-15T10:00:00.000Z")
	})

	it("should return undefined when undefined", () => {
		expect(searchParamParsers.date(undefined)).toBeUndefined()
	})

	it("should return the defaultValue when input is invalid", () => {
		const defaultDate = new Date("2024-01-01T00:00:00.000Z")
		const result = searchParamParsers.date("not-a-date", defaultDate)
		expect(result).toBe(defaultDate)
	})

	it("should return undefined for a plain date string (not ISO datetime)", () => {
		// z.string().datetime() requires full ISO format
		const result = searchParamParsers.date("2024-06-15")
		expect(result).toBeUndefined()
	})
})
