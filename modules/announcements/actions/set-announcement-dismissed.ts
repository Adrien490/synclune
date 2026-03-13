"use server";

import type { ActionState } from "@/shared/types/server-action";
import { validateInput, success, handleActionError } from "@/shared/lib/actions";

import { dismissAnnouncementSchema } from "@/modules/announcements/schemas/dismiss-announcement.schema";
import { dismissAnnouncementAction } from "./dismiss-announcement";

export async function setAnnouncementDismissed(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
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
