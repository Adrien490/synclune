import { z } from "zod";

// ============================================================================
// ANNOUNCEMENT BAR SCHEMAS
// ============================================================================

export const announcementMessageSchema = z
	.string()
	.trim()
	.min(1, "Le message est requis")
	.max(200, "Le message ne peut pas dépasser 200 caractères");

export const announcementLinkSchema = z
	.string()
	.trim()
	.max(2048, "Le lien ne peut pas dépasser 2048 caractères")
	.refine((val) => val === "" || val.startsWith("/") || val.startsWith("https://"), {
		message: "Le lien doit commencer par / ou https://",
	})
	.optional()
	.nullable()
	.transform((val) => (val === "" ? null : val));

export const announcementLinkTextSchema = z
	.string()
	.trim()
	.max(50, "Le texte du lien ne peut pas dépasser 50 caractères")
	.optional()
	.nullable()
	.transform((val) => (val === "" ? null : val));

export const dismissDurationHoursSchema = z
	.number()
	.int("La durée doit être un nombre entier")
	.min(1, "La durée minimum est de 1 heure")
	.max(720, "La durée maximum est de 720 heures (30 jours)");

// ============================================================================
// MUTATION SCHEMAS
// ============================================================================

export const createAnnouncementSchema = z
	.object({
		message: announcementMessageSchema,
		link: announcementLinkSchema,
		linkText: announcementLinkTextSchema,
		startsAt: z.coerce.date().optional(),
		endsAt: z.coerce
			.date()
			.optional()
			.nullable()
			.transform((val) => val ?? null),
		dismissDurationHours: dismissDurationHoursSchema.default(24),
	})
	.refine(
		(data) => {
			if (data.link && !data.linkText) return false;
			return true;
		},
		{ message: "Le texte du lien est requis quand un lien est spécifié", path: ["linkText"] },
	)
	.refine(
		(data) => {
			if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) return false;
			return true;
		},
		{ message: "La date de fin doit être après la date de début", path: ["endsAt"] },
	);

export const updateAnnouncementSchema = z
	.object({
		id: z.cuid2("ID invalide"),
		message: announcementMessageSchema,
		link: announcementLinkSchema,
		linkText: announcementLinkTextSchema,
		startsAt: z.coerce.date(),
		endsAt: z.coerce
			.date()
			.optional()
			.nullable()
			.transform((val) => val ?? null),
		dismissDurationHours: dismissDurationHoursSchema,
	})
	.refine(
		(data) => {
			if (data.link && !data.linkText) return false;
			return true;
		},
		{ message: "Le texte du lien est requis quand un lien est spécifié", path: ["linkText"] },
	)
	.refine(
		(data) => {
			if (data.endsAt && data.endsAt <= data.startsAt) return false;
			return true;
		},
		{ message: "La date de fin doit être après la date de début", path: ["endsAt"] },
	);

export const deleteAnnouncementSchema = z.object({
	id: z.cuid2("ID invalide"),
});

export const toggleAnnouncementStatusSchema = z.object({
	id: z.cuid2("ID invalide"),
	isActive: z.boolean(),
});

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
