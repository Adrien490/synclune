import { z } from "zod";

export const updateNotesSchema = z.object({
	requestId: z.cuid2(),
	notes: z
		.string()
		.max(2000, "Les notes ne peuvent pas dépasser 2000 caractères")
		.transform((val) => (val.trim() === "" ? null : val.trim())),
});

export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
