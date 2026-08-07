"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { success, error, validateInput, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { reconcileInvoiceOrder } from "@/modules/cron/services/reconcile-invoices.service";
import { getOrderInvalidationTags } from "@/modules/orders/constants/cache";

const schema = z.object({
	orderId: z.cuid2("orderId invalide"),
});

/**
 * Server Action "Relancer" déclenchable depuis le dashboard admin
 * `/admin/ventes/facturation` quand une anomalie est détectée.
 *
 * Exécute synchronement la logique du cron `reconcile-invoices` sur UN order,
 * pour donner un feedback immédiat à l'admin. Idempotent : si la commande a
 * déjà été rattrapée entre temps, retourne success sans rien faire.
 *
 * Cf. audit monitoring 2026-05-28 EINV-OPS-007.
 */
export async function retryInvoiceGeneration(
	_prev: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	const admin = await requireAdmin();
	if ("error" in admin) return admin.error;

	// Opération LOURDE et sérialisée sur l'advisory lock avoir de l'année (rendu PDF +
	// upload + éventuel voidInvoice, tx à 30 s) : sans borne, un clic répété sur la
	// table d'anomalies empilait les transactions sur ce lock.
	const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.INVOICE_RETRY);
	if ("error" in rateLimit) return rateLimit.error;

	const validation = validateInput(schema, { orderId: formData.get("orderId") });
	if ("error" in validation) return validation.error;

	const { orderId } = validation.data;

	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { id: true },
		});
		if (!order) {
			return error("Commande introuvable");
		}

		const result = await reconcileInvoiceOrder(orderId);

		// Cette action peut poser un `invoiceNumber`, archiver un PDF et émettre un
		// avoir, en écrivant des entrées d'OrderHistory : n'invalider que les deux tags
		// de liste laissait la page détail de la commande périmée.
		for (const tag of getOrderInvalidationTags(orderId)) {
			updateTag(tag);
		}

		if (result.kind === "recovered") {
			const parts: string[] = [];
			if (result.invoiceNumberRecovered) parts.push("numéro");
			if (result.pdfArchiveRecovered) parts.push("PDF");
			if (result.creditNoteRecovered) parts.push("avoir");
			return success(`Facture rattrapée (${parts.join(", ") || "aucune action"})`);
		}
		if (result.kind === "failed") {
			return error("Le rattrapage a échoué — voir Sentry");
		}
		return success("Rien à reconcilier (commande déjà saine)");
	} catch (e) {
		logger.error("retryInvoiceGeneration threw", e, {
			action: "retryInvoiceGeneration",
			orderId,
		});
		return handleActionError(e, "Erreur lors de la relance");
	}
}
