import { z } from "zod";

import { isSafeStorefrontLink } from "@/shared/utils/is-safe-storefront-link";

import { parseParisDateTimeLocal } from "../utils/paris-datetime";

export const closeStoreSchema = z
	.object({
		closureMessage: z
			.string()
			.trim()
			.min(1, "Un message de fermeture est requis")
			.max(500, "Le message ne peut pas dépasser 500 caractères"),
		reopensAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => parseParisDateTimeLocal(val)),
	})
	.refine(
		(data) => {
			if (!data.reopensAt) return true;
			return data.reopensAt.getTime() > Date.now();
		},
		{
			message: "La date de réouverture doit être dans le futur",
			path: ["reopensAt"],
		},
	);

export const updateClosureMessageSchema = z.object({
	closureMessage: z
		.string()
		.trim()
		.min(1, "Un message de fermeture est requis")
		.max(500, "Le message ne peut pas dépasser 500 caractères"),
});

export const updateReopensAtSchema = z
	.object({
		reopensAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => parseParisDateTimeLocal(val)),
	})
	.refine(
		(data) => {
			if (!data.reopensAt) return true;
			return data.reopensAt.getTime() > Date.now();
		},
		{
			message: "La date de réouverture doit être dans le futur",
			path: ["reopensAt"],
		},
	);

export const updateAnnouncementSchema = z
	.object({
		message: z
			.string()
			.trim()
			.max(200, "Le message ne peut pas dépasser 200 caractères")
			.optional()
			.default("")
			.transform((val) => (val === "" ? null : val)),
		link: z
			.string()
			.trim()
			.max(2048, "Le lien ne peut pas dépasser 2048 caractères")
			.optional()
			.default("")
			.refine((val) => val === "" || isSafeStorefrontLink(val), {
				message: "Le lien doit commencer par / (chemin interne) ou https://",
			})
			.transform((val) => (val === "" ? null : val)),
		startsAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => parseParisDateTimeLocal(val)),
		endsAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => parseParisDateTimeLocal(val)),
		isActive: z
			.union([z.boolean(), z.string()])
			.optional()
			.default(false)
			.transform((val) => val === true || val === "true" || val === "on"),
	})
	.refine(
		(data) => {
			if (!data.startsAt || !data.endsAt) return true;
			return data.endsAt.getTime() > data.startsAt.getTime();
		},
		{
			message: "La date de fin doit être postérieure à la date de début",
			path: ["endsAt"],
		},
	)
	.refine(
		(data) => {
			if (data.isActive && (!data.message || data.message.length === 0)) return false;
			return true;
		},
		{
			message: "Un message est requis pour activer le bandeau",
			path: ["message"],
		},
	);
