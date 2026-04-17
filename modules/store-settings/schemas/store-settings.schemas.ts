import { z } from "zod";

export const toggleStoreClosureSchema = z
	.object({
		isClosed: z.boolean(),
		closureMessage: z
			.string()
			.max(500, "Le message ne peut pas dépasser 500 caractères")
			.optional()
			.default(""),
		reopensAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => (val === "" ? null : new Date(val))),
	})
	.refine((data) => !data.isClosed || data.closureMessage.length > 0, {
		message: "Un message de fermeture est requis",
		path: ["closureMessage"],
	})
	.refine(
		(data) => {
			if (!data.isClosed || !data.reopensAt) return true;
			return data.reopensAt.getTime() > Date.now();
		},
		{
			message: "La date de réouverture doit être dans le futur",
			path: ["reopensAt"],
		},
	);

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
			.transform((val) => (val === "" ? null : new Date(val))),
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
			.transform((val) => (val === "" ? null : new Date(val))),
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

export const scheduleClosureSchema = z
	.object({
		scheduledCloseAt: z
			.string()
			.min(1, "La date de fermeture est requise")
			.transform((val) => new Date(val)),
		closureMessage: z
			.string()
			.trim()
			.min(1, "Un message de fermeture est requis")
			.max(500, "Le message ne peut pas dépasser 500 caractères"),
		reopensAt: z
			.string()
			.optional()
			.default("")
			.transform((val) => (val === "" ? null : new Date(val))),
	})
	.refine(
		(data) => {
			if (!(data.scheduledCloseAt instanceof Date)) return true;
			return data.scheduledCloseAt.getTime() > Date.now();
		},
		{
			message: "La date de fermeture doit être dans le futur",
			path: ["scheduledCloseAt"],
		},
	)
	.refine(
		(data) => {
			if (!data.reopensAt || !(data.scheduledCloseAt instanceof Date)) return true;
			return data.reopensAt.getTime() > data.scheduledCloseAt.getTime();
		},
		{
			message: "La date de réouverture doit être postérieure à la date de fermeture",
			path: ["reopensAt"],
		},
	);

export type ToggleStoreClosureInput = z.infer<typeof toggleStoreClosureSchema>;
export type CloseStoreInput = z.infer<typeof closeStoreSchema>;
export type UpdateClosureMessageInput = z.infer<typeof updateClosureMessageSchema>;
export type UpdateReopensAtInput = z.infer<typeof updateReopensAtSchema>;
export type ScheduleClosureInput = z.infer<typeof scheduleClosureSchema>;
