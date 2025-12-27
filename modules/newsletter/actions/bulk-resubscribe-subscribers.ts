"use server";

import { NewsletterStatus } from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { getNewsletterInvalidationTags } from "../constants/cache";

import { bulkResubscribeSubscribersSchema } from "../schemas/subscriber.schemas";

// Limite de sécurité pour éviter DoS
const MAX_BULK_IDS = 1000;
const MAX_JSON_LENGTH = 30000; // ~1000 CUID2 IDs

/**
 * Server Action ADMIN pour réabonner plusieurs abonnés en masse
 * Ne réabonne que les abonnés dont l'email est vérifié
 */
export async function bulkResubscribeSubscribers(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		const idsRaw = formData.get("ids");

		// Validation type et taille avant JSON.parse
		if (!idsRaw || typeof idsRaw !== "string") {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		if (idsRaw.length > MAX_JSON_LENGTH) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `Données trop volumineuses (max ${MAX_JSON_LENGTH} caractères)`,
			};
		}

		let ids: string[];
		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format JSON invalide",
			};
		}

		// Vérification limite
		if (ids.length > MAX_BULK_IDS) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: `Maximum ${MAX_BULK_IDS} abonnés par opération`,
			};
		}

		const result = bulkResubscribeSubscribersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Réabonner en masse avec transaction pour atomicité
		// Ne réabonne que les abonnés déjà confirmés dans le passé (confirmedAt)
		const updateResult = await prisma.$transaction(async (tx) => {
			return tx.newsletterSubscriber.updateMany({
				where: {
					id: { in: result.data.ids },
					status: NewsletterStatus.UNSUBSCRIBED,
					confirmedAt: { not: null },
				},
				data: { status: NewsletterStatus.CONFIRMED, unsubscribedAt: null },
			});
		});

		if (updateResult.count === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné éligible (doit être inactif avec email vérifié)",
			};
		}

		// Invalider le cache
		getNewsletterInvalidationTags().forEach((tag) => updateTag(tag));

		// Audit log
		console.log(
			`[BULK_RESUBSCRIBE_AUDIT] Admin resubscribed ${updateResult.count} subscribers`
		);

		const skipped = result.data.ids.length - updateResult.count;
		let message = `${updateResult.count} abonné${updateResult.count > 1 ? "s" : ""} réabonné${updateResult.count > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà actif${skipped > 1 ? "s" : ""} ou non vérifié${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_RESUBSCRIBE_SUBSCRIBERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors du réabonnement",
		};
	}
}
