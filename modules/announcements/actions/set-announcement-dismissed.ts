"use server";

import { headers } from "next/headers";

import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, handleActionError } from "@/shared/lib/actions";
import { enforceRateLimit } from "@/shared/lib/actions/rate-limit";
import { getClientIp } from "@/shared/lib/rate-limit";
import { PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT } from "@/shared/lib/rate-limit-config";

import { dismissAnnouncementSchema } from "@/modules/announcements/schemas/dismiss-announcement.schema";
import { dismissAnnouncementAction } from "./dismiss-announcement";

export async function setAnnouncementDismissed(
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

	const validated = validateInput(dismissAnnouncementSchema, {
		announcementId: formData.get("announcementId"),
		dismissDurationHours: formData.get("dismissDurationHours"),
	});
	if ("error" in validated) return validated.error;

	try {
		const { announcementId, dismissDurationHours } = validated.data;
		await dismissAnnouncementAction(announcementId, dismissDurationHours);
		return success("Annonce masquée");
	} catch (e) {
		return handleActionError(e, "Erreur lors du masquage");
	}
}
