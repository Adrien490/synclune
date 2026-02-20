import { describe, it, expect } from "vitest"
import { stripDeletedResponse, stripDeletedResponses } from "../strip-deleted-response"

// ============================================================================
// stripDeletedResponse
// ============================================================================

describe("stripDeletedResponse", () => {
	it("returns the review unchanged when response is null", () => {
		const review = { id: "1", response: null }
		const result = stripDeletedResponse(review)

		expect(result.response).toBeNull()
	})

	it("nullifies the response when deletedAt is set", () => {
		const review = {
			id: "1",
			response: {
				content: "Merci pour votre avis",
				authorName: "Admin",
				deletedAt: new Date("2025-01-01"),
			},
		}
		const result = stripDeletedResponse(review)

		expect(result.response).toBeNull()
	})

	it("strips deletedAt from the response when it is null/falsy", () => {
		const review = {
			id: "1",
			response: {
				content: "Merci pour votre avis",
				authorName: "Admin",
				deletedAt: null,
			},
		}
		const result = stripDeletedResponse(review)

		expect(result.response).not.toBeNull()
		expect(result.response).toEqual({
			content: "Merci pour votre avis",
			authorName: "Admin",
		})
		expect(result.response).not.toHaveProperty("deletedAt")
	})

	it("does not mutate the original review object", () => {
		const review = {
			id: "1",
			response: {
				content: "Merci",
				authorName: "Admin",
				deletedAt: null,
			},
		}
		const original = { ...review, response: { ...review.response } }
		stripDeletedResponse(review)

		expect(review).toEqual(original)
	})

	it("preserves all other review properties", () => {
		const review = {
			id: "1",
			rating: 5,
			title: "Super produit",
			response: {
				content: "Merci",
				deletedAt: null,
			},
		}
		const result = stripDeletedResponse(review)

		expect(result.id).toBe("1")
		expect(result.rating).toBe(5)
		expect(result.title).toBe("Super produit")
	})

	it("treats a truthy deletedAt string as deleted", () => {
		const review = {
			id: "1",
			response: {
				content: "Response",
				deletedAt: "2025-06-15T00:00:00Z",
			},
		}
		const result = stripDeletedResponse(review)

		expect(result.response).toBeNull()
	})
})

// ============================================================================
// stripDeletedResponses
// ============================================================================

describe("stripDeletedResponses", () => {
	it("processes an empty array", () => {
		const result = stripDeletedResponses([])

		expect(result).toEqual([])
	})

	it("strips deleted responses from multiple reviews", () => {
		const reviews = [
			{
				id: "1",
				response: { content: "Active", deletedAt: null },
			},
			{
				id: "2",
				response: { content: "Deleted", deletedAt: new Date() },
			},
			{
				id: "3",
				response: null,
			},
		]
		const result = stripDeletedResponses(reviews)

		expect(result[0].response).toEqual({ content: "Active" })
		expect(result[1].response).toBeNull()
		expect(result[2].response).toBeNull()
	})
})
