import { z } from "zod";

/**
 * Schema for the install prompt cookie value (JSON).
 * v = visitCount, d = dismissCount, p = permanentlyDismissed
 */
export const installPromptCookieSchema = z.object({
	v: z.number().int().nonnegative(),
	d: z.number().int().nonnegative(),
	p: z.boolean(),
});

export type InstallPromptCookieValue = z.infer<typeof installPromptCookieSchema>;

/** Schema for the install prompt action input */
export const installPromptActionSchema = z.object({
	action: z.enum(["dismiss", "install", "visit"]),
});

export type InstallPromptActionInput = z.infer<typeof installPromptActionSchema>;
