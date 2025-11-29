import { z } from "zod";

export const deleteUploadThingFilesSchema = z.object({
	fileUrls: z
		.array(z.string().url({ message: "L'URL du fichier est invalide" }))
		.min(1, "Au moins une URL est requise"),
});

export type DeleteUploadThingFilesInput = z.infer<
	typeof deleteUploadThingFilesSchema
>;
