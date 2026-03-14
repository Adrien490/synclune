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

export type ToggleStoreClosureInput = z.infer<typeof toggleStoreClosureSchema>;
