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
