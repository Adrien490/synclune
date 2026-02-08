"use server";

import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { validateInput, handleActionError, success, validationError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";
import { BULK_OPERATIONS } from "../constants/subscriber.constants";
import { bulkDeleteSubscribersSchema } from "../schemas/subscriber.schemas";

/**
 * Server Action ADMIN pour supprimer définitivement plusieurs abonnés en masse (RGPD)
 */
export async function bulkDeleteSubscribers(
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

		const validated = validateInput(bulkDeleteSubscribersSchema, { ids });
		if ("error" in validated) return validated.error;

		// Supprimer en masse avec transaction pour atomicité
		const deleteResult = await prisma.$transaction(async (tx) => {
			return tx.newsletterSubscriber.deleteMany({
				where: { id: { in: validated.data.ids } },
			});
		});

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Audit log
		console.log(
			`[BULK_DELETE_AUDIT] Admin deleted ${deleteResult.count} subscribers`
		);

		return success(`${deleteResult.count} abonné${deleteResult.count > 1 ? "s" : ""} supprimé${deleteResult.count > 1 ? "s" : ""} définitivement`);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression");
	}
}
