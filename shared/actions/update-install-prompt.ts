"use server";

import { cookies } from "next/headers";
import {
	INSTALL_PROMPT_COOKIE_NAME,
	INSTALL_PROMPT_COOKIE_MAX_AGE,
	INSTALL_PROMPT_MAX_DISMISSALS,
} from "@/shared/constants/install-prompt";
import {
	installPromptCookieSchema,
	type InstallPromptActionInput,
} from "@/shared/schemas/install-prompt.schema";

/**
 * Core server action to update the install prompt cookie.
 * Reads current state, applies mutation, writes back.
 */
export async function updateInstallPrompt(
	input: InstallPromptActionInput,
): Promise<{ visitCount: number; dismissCount: number; permanentlyDismissed: boolean }> {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(INSTALL_PROMPT_COOKIE_NAME);

	// Read current state
	let v = 0;
	let d = 0;
	let p = false;

	if (cookie?.value) {
		try {
			const parsed = installPromptCookieSchema.safeParse(JSON.parse(cookie.value));
			if (parsed.success) {
				v = parsed.data.v;
				d = parsed.data.d;
				p = parsed.data.p;
			}
		} catch {
			// Use defaults on parse error
		}
	}

	// Apply mutation
	switch (input.action) {
		case "visit":
			v += 1;
			break;
		case "dismiss":
			d += 1;
			if (d >= INSTALL_PROMPT_MAX_DISMISSALS) {
				p = true;
			}
			break;
		case "install":
			p = true;
			break;
	}

	// Write cookie
	cookieStore.set(INSTALL_PROMPT_COOKIE_NAME, JSON.stringify({ v, d, p }), {
		path: "/",
		maxAge: INSTALL_PROMPT_COOKIE_MAX_AGE,
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
	});

	return { visitCount: v, dismissCount: d, permanentlyDismissed: p };
}
