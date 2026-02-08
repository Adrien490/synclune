"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error, validationError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { BULK_OPERATIONS } from "../constants/subscriber.constants";
import { bulkUnsubscribeSubscribersSchema } from "../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour désabonner plusieurs abonnés en masse
 */
export async function bulkUnsubscribeSubscribers(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await requireAdmin();
		if ("error" in admin) return admin.error;

		const idsRaw = formData.get("ids");

		// Validation type et taille avant JSON.parse
		if (!idsRaw || typeof idsRaw !== "string") {
			return validationError("Format des IDs invalide");
		}

		if (idsRaw.length > BULK_OPERATIONS.MAX_JSON_LENGTH) {
			return validationError(`Données trop volumineuses (max ${BULK_OPERATIONS.MAX_JSON_LENGTH} caractères)`);
		}

		let ids: string[];
		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return validationError("Format JSON invalide");
		}

		// Vérification limite
		if (ids.length > BULK_OPERATIONS.MAX_IDS) {
			return validationError(`Maximum ${BULK_OPERATIONS.MAX_IDS} abonnés par opération`);
		}

		const validated = validateInput(bulkUnsubscribeSubscribersSchema, { ids });
		if ("error" in validated) return validated.error;

		// Désabonner en masse avec transaction pour atomicité
		const updateResult = await prisma.$transaction(async (tx) => {
			return tx.newsletterSubscriber.updateMany({
				where: {
					id: { in: validated.data.ids },
					status: { not: NewsletterStatus.UNSUBSCRIBED },
				},
				data: { status: NewsletterStatus.UNSUBSCRIBED, unsubscribedAt: new Date() },
			});
		});

		if (updateResult.count === 0) {
			return error("Aucun abonné actif à désabonner");
		}

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Audit log
		console.log(
			`[BULK_UNSUBSCRIBE_AUDIT] Admin unsubscribed ${updateResult.count} subscribers`
		);

		const skipped = validated.data.ids.length - updateResult.count;
		let message = `${updateResult.count} abonné${updateResult.count > 1 ? "s" : ""} désabonné${updateResult.count > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà inactif${skipped > 1 ? "s" : ""})`;
		}

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors du désabonnement");
	}
}
