// @ts-expect-error - vitest types not installed
import { describe, it, expect } from "vitest"
import {
	createTestimonialSchema,
	updateTestimonialSchema,
	togglePublishSchema,
	deleteTestimonialSchema,
} from "../testimonial.schemas"

describe("createTestimonialSchema", () => {
	const validData = {
		authorName: "Marie",
		content: "Ce bijou est magnifique et très bien fait. Je recommande !",
		isPublished: false,
	}

	it("valide des données correctes", () => {
		const result = createTestimonialSchema.safeParse(validData)
		expect(result.success).toBe(true)
	})

	it("valide avec une URL d'image optionnelle", () => {
		const result = createTestimonialSchema.safeParse({
			...validData,
			imageUrl: "https://example.com/image.jpg",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.imageUrl).toBe("https://example.com/image.jpg")
		}
	})

	it("transforme imageUrl vide en null", () => {
		const result = createTestimonialSchema.safeParse({
			...validData,
			imageUrl: "",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.imageUrl).toBeNull()
		}
	})

	describe("authorName", () => {
		it("rejette un prénom trop court (< 2 caractères)", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				authorName: "A",
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"Le prénom doit contenir au moins 2 caractères"
				)
			}
		})

		it("rejette un prénom trop long (> 50 caractères)", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				authorName: "A".repeat(51),
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"Le prénom ne doit pas dépasser 50 caractères"
				)
			}
		})

		it("trim les espaces du prénom", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				authorName: "  Marie  ",
			})
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.authorName).toBe("Marie")
			}
		})
	})

	describe("content", () => {
		it("rejette un contenu trop court (< 20 caractères)", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				content: "Trop court",
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"Le témoignage doit contenir au moins 20 caractères"
				)
			}
		})

		it("rejette un contenu trop long (> 500 caractères)", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				content: "A".repeat(501),
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe(
					"Le témoignage ne doit pas dépasser 500 caractères"
				)
			}
		})

		it("trim les espaces du contenu", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				content: "  Ce bijou est vraiment magnifique !  ",
			})
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.content).toBe("Ce bijou est vraiment magnifique !")
			}
		})
	})

	describe("imageUrl", () => {
		it("rejette une URL invalide", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				imageUrl: "not-a-url",
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe("URL d'image invalide")
			}
		})

		it("rejette une URL trop longue (> 2048 caractères)", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				imageUrl: `https://example.com/${"a".repeat(2040)}`,
			})
			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.error.issues[0]?.message).toBe("URL trop longue")
			}
		})
	})

	describe("isPublished", () => {
		it("utilise false par défaut", () => {
			const { isPublished, ...dataWithoutPublished } = validData
			const result = createTestimonialSchema.safeParse(dataWithoutPublished)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.isPublished).toBe(false)
			}
		})

		it("accepte true", () => {
			const result = createTestimonialSchema.safeParse({
				...validData,
				isPublished: true,
			})
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.isPublished).toBe(true)
			}
		})
	})
})

describe("updateTestimonialSchema", () => {
	const validId = "clh1234567890abcdefghijkl"

	it("valide avec seulement l'id", () => {
		const result = updateTestimonialSchema.safeParse({ id: validId })
		expect(result.success).toBe(true)
	})

	it("valide avec l'id et des champs partiels", () => {
		const result = updateTestimonialSchema.safeParse({
			id: validId,
			authorName: "Sophie",
		})
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.authorName).toBe("Sophie")
			expect(result.data.content).toBeUndefined()
		}
	})

	it("rejette un id invalide", () => {
		const result = updateTestimonialSchema.safeParse({
			id: "invalid-id",
			authorName: "Sophie",
		})
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("ID de témoignage invalide")
		}
	})

	it("rejette sans id", () => {
		const result = updateTestimonialSchema.safeParse({
			authorName: "Sophie",
		})
		expect(result.success).toBe(false)
	})
})

describe("togglePublishSchema", () => {
	const validId = "clh1234567890abcdefghijkl"

	it("valide des données correctes (publish)", () => {
		const result = togglePublishSchema.safeParse({
			id: validId,
			isPublished: true,
		})
		expect(result.success).toBe(true)
	})

	it("valide des données correctes (unpublish)", () => {
		const result = togglePublishSchema.safeParse({
			id: validId,
			isPublished: false,
		})
		expect(result.success).toBe(true)
	})

	it("rejette un id invalide", () => {
		const result = togglePublishSchema.safeParse({
			id: "invalid",
			isPublished: true,
		})
		expect(result.success).toBe(false)
	})

	it("rejette sans isPublished", () => {
		const result = togglePublishSchema.safeParse({
			id: validId,
		})
		expect(result.success).toBe(false)
	})
})

describe("deleteTestimonialSchema", () => {
	const validId = "clh1234567890abcdefghijkl"

	it("valide un id correct", () => {
		const result = deleteTestimonialSchema.safeParse({ id: validId })
		expect(result.success).toBe(true)
	})

	it("rejette un id invalide", () => {
		const result = deleteTestimonialSchema.safeParse({ id: "invalid" })
		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues[0]?.message).toBe("ID de témoignage invalide")
		}
	})

	it("rejette sans id", () => {
		const result = deleteTestimonialSchema.safeParse({})
		expect(result.success).toBe(false)
	})
})
