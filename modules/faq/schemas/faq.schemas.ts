import { z } from "zod";

// ============================================================================
// FAQ SCHEMAS
// ============================================================================

export const faqLinkSchema = z.object({
	text: z.string().trim().min(1, "Le texte du lien est requis").max(100, "100 caractères maximum"),
	href: z
		.string()
		.trim()
		.min(1, "L'URL du lien est requise")
		.max(2048, "2048 caractères maximum")
		.refine((val) => val.startsWith("/") || val.startsWith("https://"), {
			message: "Le lien doit commencer par / ou https://",
		}),
});

export const faqQuestionSchema = z
	.string()
	.trim()
	.min(1, "La question est requise")
	.max(300, "La question ne peut pas dépasser 300 caractères");

export const faqAnswerSchema = z
	.string()
	.trim()
	.min(1, "La réponse est requise")
	.max(5000, "La réponse ne peut pas dépasser 5000 caractères");

export const createFaqItemSchema = z.object({
	question: faqQuestionSchema,
	answer: faqAnswerSchema,
	links: z.array(faqLinkSchema).max(5, "5 liens maximum").optional().nullable(),
	isActive: z.boolean().default(true),
});

export const updateFaqItemSchema = z.object({
	id: z.cuid2("ID invalide"),
	question: faqQuestionSchema,
	answer: faqAnswerSchema,
	links: z.array(faqLinkSchema).max(5, "5 liens maximum").optional().nullable(),
	isActive: z.boolean(),
});

export const deleteFaqItemSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const reorderFaqItemsSchema = z.object({
	items: z.array(
		z.object({
			id: z.cuid2("ID invalide"),
			position: z.number().int().min(0),
		}),
	),
});
