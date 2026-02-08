"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, error, validationError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { BULK_OPERATIONS } from "../constants/subscriber.constants";
import { bulkResubscribeSubscribersSchema } from "../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour réabonner plusieurs abonnés en masse
 * Ne réabonne que les abonnés dont l'email est vérifié
 */
export async function bulkResubscribeSubscribers(
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

		const validated = validateInput(bulkResubscribeSubscribersSchema, { ids });
		if ("error" in validated) return validated.error;

		// Réabonner en masse avec transaction pour atomicité
		// Ne réabonne que les abonnés déjà confirmés dans le passé (confirmedAt)
		const updateResult = await prisma.$transaction(async (tx) => {
			return tx.newsletterSubscriber.updateMany({
				where: {
					id: { in: validated.data.ids },
					status: NewsletterStatus.UNSUBSCRIBED,
					confirmedAt: { not: null },
				},
				data: { status: NewsletterStatus.CONFIRMED, unsubscribedAt: null },
			});
		});

		if (updateResult.count === 0) {
			return error("Aucun abonné éligible (doit être inactif avec email vérifié)");
		}

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Audit log
		console.log(
			`[BULK_RESUBSCRIBE_AUDIT] Admin resubscribed ${updateResult.count} subscribers`
		);

		const skipped = validated.data.ids.length - updateResult.count;
		let message = `${updateResult.count} abonné${updateResult.count > 1 ? "s" : ""} réabonné${updateResult.count > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà actif${skipped > 1 ? "s" : ""} ou non vérifié${skipped > 1 ? "s" : ""})`;
		}

		return success(message);
	} catch (e) {
		return handleActionError(e, "Erreur lors du réabonnement");
	}
}
