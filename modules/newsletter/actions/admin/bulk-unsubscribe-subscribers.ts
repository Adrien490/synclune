"use server";

import { NewsletterStatus } from "@/app/generated/prisma";
import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { revalidatePath } from "next/cache";

import { bulkUnsubscribeSubscribersSchema } from "../../schemas/subscriber.schemas";

// Limite de sécurité pour éviter DoS
const MAX_BULK_IDS = 1000;
const MAX_JSON_LENGTH = 30000; // ~1000 CUID2 IDs

/**
 * Server Action ADMIN pour désabonner plusieurs abonnés en masse
 */
export async function bulkUnsubscribeSubscribers(
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
				message: `Trop d'IDs dans la requête (max ${MAX_BULK_IDS})`,
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

		const result = bulkUnsubscribeSubscribersSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Désabonner en masse avec une seule query (optimisation)
		const updateResult = await prisma.newsletterSubscriber.updateMany({
			where: {
				id: { in: result.data.ids },
				status: { not: NewsletterStatus.UNSUBSCRIBED },
			},
			data: { status: NewsletterStatus.UNSUBSCRIBED, unsubscribedAt: new Date() },
		});

		if (updateResult.count === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun abonné actif à désabonner",
			};
		}

		revalidatePath("/admin/marketing/newsletter");

		// Audit log
		console.log(
			`[BULK_UNSUBSCRIBE_AUDIT] Admin unsubscribed ${updateResult.count} subscribers`
		);

		const skipped = result.data.ids.length - updateResult.count;
		let message = `${updateResult.count} abonné${updateResult.count > 1 ? "s" : ""} désabonné${updateResult.count > 1 ? "s" : ""}`;
		if (skipped > 0) {
			message += ` - ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà inactif${skipped > 1 ? "s" : ""})`;
		}

		return {
			status: ActionStatus.SUCCESS,
			message,
		};
	} catch (error) {
		console.error("[BULK_UNSUBSCRIBE_SUBSCRIBERS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors du désabonnement",
		};
	}
}
