import { describe, it, expect } from "vitest";
import {
	faqLinkSchema,
	faqQuestionSchema,
	faqAnswerSchema,
	createFaqItemSchema,
	updateFaqItemSchema,
	deleteFaqItemSchema,
	reorderFaqItemsSchema,
} from "../faq.schemas";

const VALID_CUID = "clh1234567890abcdefghijklm";

// ============================================================================
// faqLinkSchema
// ============================================================================

describe("faqLinkSchema", () => {
	it("accepts a relative href starting with /", () => {
		const result = faqLinkSchema.safeParse({ text: "En savoir plus", href: "/aide/livraison" });
		expect(result.success).toBe(true);
	});

	it("accepts an absolute https href", () => {
		const result = faqLinkSchema.safeParse({
			text: "Conditions",
			href: "https://example.com/cgv",
		});
		expect(result.success).toBe(true);
	});

	it("rejects href not starting with / or https://", () => {
		const result = faqLinkSchema.safeParse({ text: "Lien", href: "http://example.com" });
		expect(result.success).toBe(false);
	});

	it("rejects empty text", () => {
		const result = faqLinkSchema.safeParse({ text: "", href: "/aide" });
		expect(result.success).toBe(false);
	});

	it("rejects text exceeding 100 characters", () => {
		const result = faqLinkSchema.safeParse({ text: "A".repeat(101), href: "/aide" });
		expect(result.success).toBe(false);
	});

	it("rejects missing href", () => {
		const result = faqLinkSchema.safeParse({ text: "Lien" });
		expect(result.success).toBe(false);
	});
});

// ============================================================================
// faqQuestionSchema
// ============================================================================

describe("faqQuestionSchema", () => {
	it("accepts a valid question", () => {
		expect(faqQuestionSchema.safeParse("Quels sont les délais de livraison ?").success).toBe(true);
	});

	it("rejects an empty string", () => {
		expect(faqQuestionSchema.safeParse("").success).toBe(false);
	});

	it("rejects a question exceeding 300 characters", () => {
		expect(faqQuestionSchema.safeParse("A".repeat(301)).success).toBe(false);
	});

	it("accepts a question of exactly 300 characters", () => {
		expect(faqQuestionSchema.safeParse("A".repeat(300)).success).toBe(true);
	});
});

// ============================================================================
// faqAnswerSchema
// ============================================================================

describe("faqAnswerSchema", () => {
	it("accepts a valid answer", () => {
		expect(faqAnswerSchema.safeParse("La livraison prend 3 à 5 jours ouvrés.").success).toBe(true);
	});

	it("rejects an empty string", () => {
		expect(faqAnswerSchema.safeParse("").success).toBe(false);
	});

	it("rejects an answer exceeding 5000 characters", () => {
		expect(faqAnswerSchema.safeParse("A".repeat(5001)).success).toBe(false);
	});

	it("accepts an answer of exactly 5000 characters", () => {
		expect(faqAnswerSchema.safeParse("A".repeat(5000)).success).toBe(true);
	});
});

// ============================================================================
// createFaqItemSchema
// ============================================================================

describe("createFaqItemSchema", () => {
	const validData = {
		question: "Puis-je retourner un article ?",
		answer: "Oui, vous disposez de 14 jours pour retourner votre commande.",
	};

	it("accepts valid minimal input", () => {
		expect(createFaqItemSchema.safeParse(validData).success).toBe(true);
	});

	it("defaults isActive to true", () => {
		const result = createFaqItemSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.isActive).toBe(true);
		}
	});

	it("accepts up to 5 links", () => {
		const link = { text: "Voir", href: "/aide" };
		const result = createFaqItemSchema.safeParse({
			...validData,
			links: [link, link, link, link, link],
		});
		expect(result.success).toBe(true);
	});

	it("rejects more than 5 links", () => {
		const link = { text: "Voir", href: "/aide" };
		const result = createFaqItemSchema.safeParse({
			...validData,
			links: [link, link, link, link, link, link],
		});
		expect(result.success).toBe(false);
	});

	it("rejects missing question", () => {
		const { question: _q, ...withoutQuestion } = validData;
		expect(createFaqItemSchema.safeParse(withoutQuestion).success).toBe(false);
	});

	it("rejects missing answer", () => {
		const { answer: _a, ...withoutAnswer } = validData;
		expect(createFaqItemSchema.safeParse(withoutAnswer).success).toBe(false);
	});
});

// ============================================================================
// updateFaqItemSchema
// ============================================================================

describe("updateFaqItemSchema", () => {
	const validData = {
		id: VALID_CUID,
		question: "Question mise à jour ?",
		answer: "Réponse mise à jour.",
		isActive: true,
	};

	it("accepts valid complete input", () => {
		expect(updateFaqItemSchema.safeParse(validData).success).toBe(true);
	});

	it("rejects missing id", () => {
		const { id: _id, ...withoutId } = validData;
		expect(updateFaqItemSchema.safeParse(withoutId).success).toBe(false);
	});

	it("rejects invalid id format", () => {
		expect(updateFaqItemSchema.safeParse({ ...validData, id: "not-a-cuid" }).success).toBe(false);
	});

	it("rejects missing isActive", () => {
		const { isActive: _ia, ...withoutIsActive } = validData;
		expect(updateFaqItemSchema.safeParse(withoutIsActive).success).toBe(false);
	});
});

// ============================================================================
// deleteFaqItemSchema
// ============================================================================

describe("deleteFaqItemSchema", () => {
	it("accepts a valid cuid2", () => {
		expect(deleteFaqItemSchema.safeParse({ id: VALID_CUID }).success).toBe(true);
	});

	it("rejects missing id", () => {
		expect(deleteFaqItemSchema.safeParse({}).success).toBe(false);
	});

	it("rejects invalid id format", () => {
		expect(deleteFaqItemSchema.safeParse({ id: "bad-id" }).success).toBe(false);
	});
});

// ============================================================================
// reorderFaqItemsSchema
// ============================================================================

describe("reorderFaqItemsSchema", () => {
	it("accepts a valid array of items", () => {
		const result = reorderFaqItemsSchema.safeParse({
			items: [
				{ id: VALID_CUID, position: 0 },
				{ id: VALID_CUID, position: 1 },
			],
		});
		expect(result.success).toBe(true);
	});

	it("accepts an empty items array", () => {
		expect(reorderFaqItemsSchema.safeParse({ items: [] }).success).toBe(true);
	});

	it("rejects a negative position", () => {
		const result = reorderFaqItemsSchema.safeParse({
			items: [{ id: VALID_CUID, position: -1 }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a non-integer position", () => {
		const result = reorderFaqItemsSchema.safeParse({
			items: [{ id: VALID_CUID, position: 1.5 }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid id in item", () => {
		const result = reorderFaqItemsSchema.safeParse({
			items: [{ id: "not-a-cuid", position: 0 }],
		});
		expect(result.success).toBe(false);
	});
});
