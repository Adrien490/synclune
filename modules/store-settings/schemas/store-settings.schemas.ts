import { z } from "zod";

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
