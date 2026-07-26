"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { success, error, validateInput, handleActionError } from "@/shared/lib/actions";
import type { ActionState } from "@/shared/types/server-action";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { reconcileInvoiceOrder } from "@/modules/cron/services/reconcile-invoices.service";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

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

		updateTag(SHARED_CACHE_TAGS.ADMIN_ORDERS_LIST);
		updateTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

		if (result.kind === "recovered") {
			const parts: string[] = [];
			if (result.invoiceNumberRecovered) parts.push("numéro");
			if (result.pdfArchiveRecovered) parts.push("PDF");
			if (result.creditNoteRecovered) parts.push("avoir");
			return success(`Facture rattrapée (${parts.join(", ") || "aucune action"})`);
		}
		if (result.kind === "escalated") {
			return error("Tentatives multiples échouées — voir runbook + Sentry");
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
