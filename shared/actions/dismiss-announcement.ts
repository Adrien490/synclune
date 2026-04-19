"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";

import { validateInput, success, handleActionError } from "@/shared/lib/actions";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { getClientIp } from "@/shared/lib/rate-limit";
import { PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

/** 24h hardcoded dismiss TTL (replaces former per-record dismissDurationHours) */
const DISMISS_MAX_AGE_SECONDS = 24 * 60 * 60;

const dismissSchema = z.object({
	hash: z
		.string()
		.trim()
		.regex(/^[a-f0-9]{16}$/, "Hash invalide"),
});

export async function dismissAnnouncement(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const ip = (await getClientIp(await headers())) ?? "unknown";
	const rateLimit = await enforceRateLimit(
		`announcement-dismiss:${ip}`,
		PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT,
		ip,
	);
	if ("error" in rateLimit) return rateLimit.error;

	const validated = validateInput(dismissSchema, {
		hash: formData.get("hash"),
	});
	if ("error" in validated) return validated.error;

	try {
		const cookieStore = await cookies();
		cookieStore.set(`announcement_dismissed_${validated.data.hash}`, "1", {
			httpOnly: true,
			sameSite: "strict",
			path: "/",
			maxAge: DISMISS_MAX_AGE_SECONDS,
			secure: process.env.NODE_ENV === "production",
		});
		return success("Annonce masquée");
	} catch (e) {
		return handleActionError(e, "Erreur lors du masquage");
	}
}
