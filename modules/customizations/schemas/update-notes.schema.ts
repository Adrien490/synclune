import { z } from "zod";

export const updateNotesSchema = z.object({
	requestId: z.cuid(),
	notes: z
		.string()
		.max(2000, "Les notes ne peuvent pas depasser 2000 caracteres")
		.transform((val) => (val.trim() === "" ? null : val.trim())),
});

export type UpdateNotesInput = z.infer<typeof updateNotesSchema>;
