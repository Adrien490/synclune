import { z } from "zod";

export const dismissAnnouncementSchema = z.object({
	announcementId: z.string().min(1),
	dismissDurationHours: z.preprocess(Number, z.number().positive()),
});

export type DismissAnnouncementInput = z.infer<typeof dismissAnnouncementSchema>;
